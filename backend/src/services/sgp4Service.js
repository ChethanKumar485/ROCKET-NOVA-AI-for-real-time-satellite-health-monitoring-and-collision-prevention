import * as satellite from 'satellite.js';

const positionCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Propagate satellite position using SGP4
 */
export function propagate(tle1, tle2, date = new Date()) {
  const key = `${tle1.slice(0,30)}:${Math.floor(date.getTime()/30000)}`;
  if (positionCache.has(key)) return positionCache.get(key);

  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    if (satrec.error !== 0) throw new Error(`TLE parse error: ${satrec.error}`);

    const posVel = satellite.propagate(satrec, date);
    if (!posVel.position) throw new Error('Propagation failed');

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posVel.position, gmst);

    const lat = satellite.degreesLat(geodetic.latitude);
    const lon = satellite.degreesLong(geodetic.longitude);
    const alt = geodetic.height;

    const vel = posVel.velocity;
    const speed = Math.sqrt(vel.x**2 + vel.y**2 + vel.z**2);

    // Eclipse detection (simplified)
    const sunPos = getSunPosition(date);
    const eclipse = isInEclipse(posVel.position, sunPos);

    // Footprint radius (km)
    const earthR = 6371;
    const footprint = earthR * Math.acos(earthR / (earthR + alt)) * (180 / Math.PI) * 111;

    const result = { lat, lon, altitude: alt, velocity: speed, eclipse, footprint,
      posECI: posVel.position, velECI: posVel.velocity, satrec };

    positionCache.set(key, result);
    setTimeout(() => positionCache.delete(key), CACHE_TTL);
    return result;
  } catch (err) {
    throw new Error(`SGP4 propagation error: ${err.message}`);
  }
}

/**
 * Batch propagate all satellites at once
 */
export function batchPropagate(satellites, date = new Date()) {
  const results = {};
  satellites.forEach(sat => {
    if (!sat.tle_line1 || !sat.tle_line2) return;
    try {
      results[sat.id] = propagate(sat.tle_line1, sat.tle_line2, date);
    } catch {}
  });
  return results;
}

/**
 * Generate ground track (future positions)
 */
export function groundTrack(tle1, tle2, minutes = 90, stepMin = 2) {
  const track = [];
  const now = Date.now();
  for (let m = -20; m <= minutes; m += stepMin) {
    try {
      const d = new Date(now + m * 60000);
      const p = propagate(tle1, tle2, d);
      track.push({ lat: p.lat, lon: p.lon, alt: p.altitude, t: d.toISOString() });
    } catch {}
  }
  return track;
}

/**
 * Calculate passes over a ground station
 */
export function calculatePasses(tle1, tle2, stationLat, stationLon, stationAlt = 0, hours = 24) {
  const passes = [];
  const now = Date.now();
  const stepMs = 30000; // 30-second steps
  const endTime = now + hours * 3600000;

  let inPass = false, passStart = null, maxEl = 0, maxElTime = null;
  const stationLat_r = stationLat * Math.PI / 180;
  const stationLon_r = stationLon * Math.PI / 180;

  for (let t = now; t < endTime; t += stepMs) {
    try {
      const date = new Date(t);
      const satrec = satellite.twoline2satrec(tle1, tle2);
      const posVel = satellite.propagate(satrec, date);
      if (!posVel.position) continue;

      const gmst = satellite.gstime(date);
      const lookAngles = satellite.ecfToLookAngles(
        { latitude: stationLat_r, longitude: stationLon_r, height: stationAlt / 1000 },
        satellite.eciToEcf(posVel.position, gmst)
      );
      const el = lookAngles.elevation * 180 / Math.PI;

      if (el > 5) {
        if (!inPass) { inPass = true; passStart = date; maxEl = 0; }
        if (el > maxEl) { maxEl = el; maxElTime = date; }
      } else if (inPass) {
        inPass = false;
        if (maxEl > 5) {
          passes.push({
            aos: passStart.toISOString(),
            los: new Date(t).toISOString(),
            maxElevation: Math.round(maxEl * 10) / 10,
            maxElTime: maxElTime?.toISOString(),
            duration: Math.round((t - passStart.getTime()) / 1000)
          });
        }
      }
    } catch {}
  }
  return passes.slice(0, 10);
}

/**
 * Compute conjunction risk between two satellites
 */
export function conjunctionAnalysis(sat1, sat2, hours = 24, stepMin = 1) {
  if (!sat1.tle_line1 || !sat2.tle_line1) return null;
  const now = Date.now();
  let minDist = Infinity, minDistTime = null;

  for (let m = 0; m <= hours * 60; m += stepMin) {
    try {
      const d = new Date(now + m * 60000);
      const p1 = propagate(sat1.tle_line1, sat1.tle_line2, d);
      const p2 = propagate(sat2.tle_line1, sat2.tle_line2, d);
      const dx = (p1.lon - p2.lon) * 111 * Math.cos((p1.lat + p2.lat) / 2 * Math.PI / 180);
      const dy = (p1.lat - p2.lat) * 111;
      const dz = p1.altitude - p2.altitude;
      const dist = Math.sqrt(dx**2 + dy**2 + dz**2);
      if (dist < minDist) { minDist = dist; minDistTime = d; }
    } catch {}
  }
  return { minDistance: Math.round(minDist), tca: minDistTime?.toISOString(),
    riskLevel: minDist < 5 ? 'critical' : minDist < 25 ? 'high' : minDist < 100 ? 'medium' : 'low' };
}

function getSunPosition(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L = (280.46646 + 36000.76983 * T) % 360;
  const M = (357.52911 + 35999.05029 * T) % 360 * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M);
  const sunLon = (L + C) * Math.PI / 180;
  const R = 149598000;
  return { x: R * Math.cos(sunLon), y: R * Math.sin(sunLon), z: 0 };
}

function isInEclipse(pos, sunPos) {
  const earthR = 6371;
  const dot = pos.x * sunPos.x + pos.y * sunPos.y + pos.z * sunPos.z;
  if (dot > 0) return false;
  const sunMag = Math.sqrt(sunPos.x**2 + sunPos.y**2 + sunPos.z**2);
  const sunUnit = { x: sunPos.x/sunMag, y: sunPos.y/sunMag, z: sunPos.z/sunMag };
  const proj = dot / sunMag;
  const perpX = pos.x - proj * sunUnit.x;
  const perpY = pos.y - proj * sunUnit.y;
  const perpZ = pos.z - proj * sunUnit.z;
  return Math.sqrt(perpX**2 + perpY**2 + perpZ**2) < earthR;
}
