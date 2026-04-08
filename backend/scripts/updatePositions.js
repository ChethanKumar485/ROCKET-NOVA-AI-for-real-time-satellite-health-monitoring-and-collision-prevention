/**
 * Run this as a cron job to batch-update satellite positions
 * Usage: node scripts/updatePositions.js
 * Cron: */5 * * * * node /path/to/scripts/updatePositions.js
 */
import { getDB, initDB } from '../src/database/init.js';
import { propagate } from '../src/services/sgp4Service.js';

const db = initDB();
const sats = db.prepare(`SELECT s.id, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE o.tle_line1 IS NOT NULL AND o.tle_line1 != ''`).all();

const insert = db.prepare(`INSERT INTO positions (satellite_id, latitude, longitude, altitude_km, velocity_km_s, eclipse) VALUES (?,?,?,?,?,?)`);
const batch = db.transaction(() => {
  let count = 0;
  sats.forEach(sat => {
    try {
      const p = propagate(sat.tle_line1, sat.tle_line2);
      insert.run(sat.id, p.lat, p.lon, p.altitude, p.velocity, p.eclipse ? 1 : 0);
      count++;
    } catch {}
  });
  return count;
});

const count = batch();
console.log(`✅ Updated positions for ${count}/${sats.length} satellites at ${new Date().toISOString()}`);
db.close();
