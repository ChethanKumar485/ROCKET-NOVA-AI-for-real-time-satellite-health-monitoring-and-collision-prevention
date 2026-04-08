import { initDB, getDB } from '../src/database/init.js';

const SATELLITES = [
  { norad: 25544, name: 'ISS (ZARYA)', agency: 'NASA/Roscosmos', type: 'space_station', mission: 'Crewed orbital laboratory & microgravity research',
    tle1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9008',
    tle2: '2 25544  51.6400 208.9163 0006703 151.6347 208.5557 15.49560943430811',
    launch: '1998-11-20', health: 92, battery: 88, fuel: 71, temp: 22, signal: 98, solar: 95, uptime: 9190 },
  { norad: 20580, name: 'HUBBLE', agency: 'NASA/ESA', type: 'science', mission: 'Deep space optical/UV/IR observatory',
    tle1: '1 20580U 90037B   24001.50000000  .00000752  00000-0  35263-4 0  9999',
    tle2: '2 20580  28.4706 145.7140 0002811 210.0731 150.0157 15.09316398992815',
    launch: '1990-04-24', health: 78, battery: 81, fuel: 22, temp: 18, signal: 95, solar: 88, uptime: 12295 },
  { norad: 43013, name: 'STARLINK-15', agency: 'SpaceX', type: 'comm', mission: 'Broadband internet constellation',
    tle1: '1 43013U 17073A   24001.50000000  .00001792  00000-0  13889-3 0  9994',
    tle2: '2 43013  53.0547 171.7419 0001448  78.5370 281.5760 15.06384108432217',
    launch: '2017-12-15', health: 96, battery: 94, fuel: 87, temp: 15, signal: 99, solar: 97, uptime: 2210 },
  { norad: 37753, name: 'GPS IIF-1', agency: 'USAF', type: 'navigation', mission: 'Global Positioning System navigation',
    tle1: '1 37753U 11036A   24001.50000000 -.00000039  00000-0  00000+0 0  9998',
    tle2: '2 37753  55.2019  90.1462 0131938 178.0049 182.1231  2.00564424467216',
    launch: '2011-05-28', health: 99, battery: 97, fuel: 93, temp: -5, signal: 100, solar: 99, uptime: 4695 },
  { norad: 25994, name: 'TERRA', agency: 'NASA', type: 'earth_obs', mission: 'Multi-instrument Earth observation platform',
    tle1: '1 25994U 99068A   24001.50000000  .00000058  00000-0  18609-4 0  9994',
    tle2: '2 25994  98.2134 359.8421 0001338  83.8712 276.2620 14.57116401257719',
    launch: '1999-12-18', health: 85, battery: 79, fuel: 41, temp: 8, signal: 92, solar: 84, uptime: 8780 },
  { norad: 27424, name: 'AQUA', agency: 'NASA', type: 'earth_obs', mission: 'Atmosphere and hydrosphere monitoring',
    tle1: '1 27424U 02022A   24001.50000000  .00000085  00000-0  25849-4 0  9994',
    tle2: '2 27424  98.2122 179.9041 0000869  87.5284 272.5990 14.57113694807915',
    launch: '2002-05-04', health: 82, battery: 77, fuel: 38, temp: 10, signal: 91, solar: 82, uptime: 7976 },
  { norad: 28654, name: 'NOAA-18', agency: 'NOAA', type: 'weather', mission: 'Atmospheric temperature/humidity profiling',
    tle1: '1 28654U 05018A   24001.50000000 -.00000032  00000-0  67013-5 0  9998',
    tle2: '2 28654  99.0608 199.7043 0014050 220.2694 139.7204 14.12497789975611',
    launch: '2005-05-20', health: 74, battery: 68, fuel: 35, temp: 12, signal: 87, solar: 76, uptime: 6811 },
  { norad: 40697, name: 'SENTINEL-2A', agency: 'ESA', type: 'earth_obs', mission: 'Land surface multispectral imaging',
    tle1: '1 40697U 15028A   24001.50000000 -.00000043  00000-0  13786-5 0  9994',
    tle2: '2 40697  98.5694  64.7483 0001060  72.5024 287.6276 14.30820250430319',
    launch: '2015-06-23', health: 97, battery: 95, fuel: 82, temp: 5, signal: 98, solar: 96, uptime: 3120 },
  { norad: 41866, name: 'GOES-16', agency: 'NOAA', type: 'weather', mission: 'Geostationary weather surveillance',
    tle1: '1 41866U 16071A   24001.50000000 -.00000217  00000-0  00000+0 0  9999',
    tle2: '2 41866   0.0540 106.5673 0000750 129.1813 286.7832  1.00271483267617',
    launch: '2016-11-19', health: 98, battery: 96, fuel: 79, temp: -2, signal: 99, solar: 97, uptime: 2600 },
  { norad: 39084, name: 'LANDSAT-8', agency: 'USGS/NASA', type: 'imaging', mission: 'Land use / land cover change monitoring',
    tle1: '1 39084U 13008A   24001.50000000  .00000011  00000-0  20591-5 0  9995',
    tle2: '2 39084  98.2194 164.6684 0001437  92.7785 267.3562 14.57098553275912',
    launch: '2013-02-11', health: 94, battery: 90, fuel: 70, temp: 7, signal: 96, solar: 93, uptime: 3979 },
  { norad: 40115, name: 'WORLDVIEW-3', agency: 'Maxar', type: 'imaging', mission: 'Sub-half-meter commercial imaging',
    tle1: '1 40115U 14048A   24001.50000000  .00000327  00000-0  50561-4 0  9997',
    tle2: '2 40115  97.9333 133.2781 0001378 132.5285 227.6033 14.83500046237817',
    launch: '2014-08-13', health: 91, battery: 87, fuel: 62, temp: 14, signal: 94, solar: 91, uptime: 3425 },
  { norad: 43923, name: 'IRIDIUM-140', agency: 'Iridium LLC', type: 'comm', mission: 'Global LEO mobile communications',
    tle1: '1 43923U 19002C   24001.50000000  .00000067  00000-0  17481-4 0  9997',
    tle2: '2 43923  86.3960  44.5042 0002040  95.5041 264.6393 14.34215776182917',
    launch: '2019-01-11', health: 95, battery: 92, fuel: 84, temp: 11, signal: 97, solar: 94, uptime: 1823 },
  { norad: 48274, name: 'ONEWEB-0208', agency: 'OneWeb', type: 'comm', mission: 'LEO broadband internet',
    tle1: '1 48274U 21022AL  24001.50000000  .00001500  00000-0  12000-3 0  9993',
    tle2: '2 48274  87.9034  54.3211 0001520  98.4210 261.7055 13.44721849180013',
    launch: '2021-03-25', health: 97, battery: 95, fuel: 90, temp: 9, signal: 98, solar: 96, uptime: 1019 },
  { norad: 44249, name: 'SENTINEL-6A', agency: 'ESA/EUMETSAT', type: 'earth_obs', mission: 'Sea level and ocean surface monitoring',
    tle1: '1 44249U 20087A   24001.50000000  .00000189  00000-0  50000-4 0  9991',
    tle2: '2 44249  66.0005 156.3200 0001100  79.1000 280.9500 13.07180000 85111',
    launch: '2020-11-21', health: 99, battery: 97, fuel: 91, temp: 4, signal: 99, solar: 98, uptime: 1137 },
  { norad: 33591, name: 'JASON-2', agency: 'NASA/CNES', type: 'science', mission: 'Ocean topography and circulation',
    tle1: '1 33591U 08032A   24001.50000000  .00000067  00000-0  28000-4 0  9998',
    tle2: '2 33591  66.0373  80.9100 0001450 127.4000 232.7000 12.87880000535118',
    launch: '2008-06-20', health: 65, battery: 58, fuel: 18, temp: 19, signal: 78, solar: 62, uptime: 5675 },
  { norad: 36508, name: 'TDRS-10', agency: 'NASA', type: 'comm', mission: 'Tracking and Data Relay (GEO)',
    tle1: '1 36508U 10011A   24001.50000000 -.00000217  00000-0  00000+0 0  9990',
    tle2: '2 36508   4.9800 359.9500 0003800  50.2000 309.8000  1.00270400507713',
    launch: '2010-03-01', health: 88, battery: 85, fuel: 55, temp: -8, signal: 96, solar: 89, uptime: 5063 },
  // Additional synthetic satellites
  { norad: 90001, name: 'AURORA-1', agency: 'ESA', type: 'science', mission: 'Auroral and magnetosphere research',
    tle1: null, tle2: null, launch: '2022-06-15',
    health: 94, battery: 89, fuel: 76, temp: -12, signal: 93, solar: 91, uptime: 658 },
  { norad: 90002, name: 'HELIOS-3', agency: 'CNES', type: 'imaging', mission: 'High-resolution optical reconnaissance',
    tle1: null, tle2: null, launch: '2021-09-08',
    health: 88, battery: 84, fuel: 65, temp: 16, signal: 90, solar: 86, uptime: 845 },
  { norad: 90003, name: 'MERIDIAN-5', agency: 'Roscosmos', type: 'comm', mission: 'Russian HEO communications relay',
    tle1: null, tle2: null, launch: '2020-11-30',
    health: 72, battery: 67, fuel: 44, temp: -18, signal: 81, solar: 71, uptime: 1124 },
  { norad: 90004, name: 'CARTOSAT-3', agency: 'ISRO', type: 'imaging', mission: 'High-resolution cartographic imaging',
    tle1: null, tle2: null, launch: '2019-11-27',
    health: 91, battery: 88, fuel: 72, temp: 21, signal: 94, solar: 90, uptime: 1500 },
  { norad: 90005, name: 'GAOFEN-5', agency: 'CNSA', type: 'earth_obs', mission: 'Hyperspectral environment monitoring',
    tle1: null, tle2: null, launch: '2018-05-09',
    health: 86, battery: 82, fuel: 58, temp: 8, signal: 88, solar: 85, uptime: 2058 },
  { norad: 90006, name: 'RADARSAT-2', agency: 'MDA', type: 'earth_obs', mission: 'Synthetic aperture radar imaging',
    tle1: null, tle2: null, launch: '2007-12-14',
    health: 76, battery: 71, fuel: 30, temp: 13, signal: 85, solar: 74, uptime: 5861 },
  { norad: 90007, name: 'KHAYYAM', agency: 'Roscosmos/Iran', type: 'imaging', mission: 'Earth observation imaging',
    tle1: null, tle2: null, launch: '2022-08-09',
    health: 89, battery: 85, fuel: 78, temp: 17, signal: 91, solar: 87, uptime: 513 },
  { norad: 90008, name: 'BIOMASS', agency: 'ESA', type: 'science', mission: 'Global forest biomass mapping (P-band SAR)',
    tle1: null, tle2: null, launch: '2024-04-29',
    health: 99, battery: 98, fuel: 97, temp: 3, signal: 99, solar: 99, uptime: 45 },
  { norad: 90009, name: 'ICEYE-X10', agency: 'ICEYE', type: 'imaging', mission: 'SAR micro-satellite constellation',
    tle1: null, tle2: null, launch: '2021-06-30',
    health: 93, battery: 90, fuel: 80, temp: 10, signal: 95, solar: 92, uptime: 919 },
  { norad: 90010, name: 'SWOT', agency: 'NASA/CNES', type: 'science', mission: 'Surface water & ocean topography',
    tle1: null, tle2: null, launch: '2022-12-16',
    health: 97, battery: 94, fuel: 88, temp: 6, signal: 97, solar: 95, uptime: 382 },
  { norad: 90011, name: 'PRISMA', agency: 'ASI', type: 'science', mission: 'Hyperspectral imaging for agriculture',
    tle1: null, tle2: null, launch: '2019-03-22',
    health: 88, battery: 84, fuel: 62, temp: 14, signal: 90, solar: 86, uptime: 1748 },
  { norad: 90012, name: 'TANDEM-X', agency: 'DLR', type: 'earth_obs', mission: 'Digital elevation model (bistatic SAR)',
    tle1: null, tle2: null, launch: '2010-06-21',
    health: 81, battery: 77, fuel: 28, temp: 11, signal: 86, solar: 79, uptime: 4939 },
  { norad: 90013, name: 'YAOGAN-37', agency: 'CNSA', type: 'imaging', mission: 'Remote sensing constellation',
    tle1: null, tle2: null, launch: '2023-07-12',
    health: 95, battery: 93, fuel: 89, temp: 9, signal: 96, solar: 94, uptime: 173 },
  { norad: 90014, name: 'SMAP', agency: 'NASA/JPL', type: 'science', mission: 'Soil moisture active/passive mapping',
    tle1: null, tle2: null, launch: '2015-01-31',
    health: 83, battery: 79, fuel: 50, temp: 7, signal: 89, solar: 82, uptime: 3253 },
];

const MISSIONS_DATA = [
  { name: 'Earth Limb Survey', type: 'observation', status: 'active', priority: 2, progress: 67, desc: 'Atmospheric limb profiling mission' },
  { name: 'Debris Avoidance Maneuver', type: 'maneuver', status: 'planned', priority: 1, progress: 0, desc: 'Scheduled delta-V burn to avoid conjunction' },
  { name: 'Calibration Pass', type: 'calibration', status: 'active', priority: 3, progress: 45, desc: 'Ground station calibration and alignment' },
  { name: 'Science Data Downlink', type: 'comms', status: 'completed', priority: 2, progress: 100, desc: '48-hour telemetry and science data downlink' },
  { name: 'Orbit Maintenance', type: 'maneuver', status: 'planned', priority: 2, progress: 0, desc: 'Semi-major axis correction burn' },
];

function rng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

async function seed() {
  const db = initDB();
  console.log('🌱 Seeding database...');

  const insertSat = db.prepare(`
    INSERT OR REPLACE INTO satellites (id, norad_id, name, agency, type, status, launch_date, mission,
      health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps, uptime_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertOrbit = db.prepare(`
    INSERT OR REPLACE INTO orbital_data (satellite_id, tle_line1, tle_line2, inclination, altitude_km, period_min)
    VALUES (?, ?, ?, ?, ?, ?)`);

  const insertMission = db.prepare(`
    INSERT OR IGNORE INTO missions (satellite_id, name, description, type, status, priority, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  const seedAll = db.transaction(() => {
    SATELLITES.forEach((s, i) => {
      const id = `SAT-${s.norad}`;
      const r = rng(s.norad);
      const status = s.health > 85 ? 'operational' : s.health > 65 ? 'degraded' : 'warning';
      const incl = s.tle2 ? parseFloat(s.tle2.split(/\s+/)[2]) : 45 + r() * 50;
      const alt = s.tle2 ? 400 + r() * 200 : 500 + r() * 35000;
      const period = s.tle2 ? 90 + r() * 10 : 90 + r() * 1350;

      insertSat.run(id, s.norad, s.name, s.agency, s.type, status, s.launch,
        s.mission, s.health, s.battery, s.fuel, s.temp, s.signal, s.solar, 10 + r() * 90, s.uptime);

      insertOrbit.run(id, s.tle1, s.tle2, incl, alt, period);

      // Assign 1-3 missions
      const mCount = 1 + Math.floor(r() * 3);
      for (let m = 0; m < mCount; m++) {
        const mission = MISSIONS_DATA[(i + m) % MISSIONS_DATA.length];
        insertMission.run(id, `${mission.name} ${i+1}`, mission.desc, mission.type, mission.status, mission.priority, mission.progress);
      }
    });
  });

  seedAll();

  // Generate 72h telemetry history
  const insertTel = db.prepare(`
    INSERT INTO telemetry_history (satellite_id, health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps, anomaly_score, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const now = Date.now();
  const telBatch = db.transaction(() => {
    SATELLITES.forEach(s => {
      const id = `SAT-${s.norad}`;
      const r = rng(s.norad + 7777);
      for (let h = 72; h >= 0; h -= 0.5) {
        const t = new Date(now - h * 3600000).toISOString();
        const jitter = () => (r() - 0.5) * 8;
        insertTel.run(id,
          Math.max(10, Math.min(100, s.health + jitter())),
          Math.max(5, Math.min(100, s.battery + jitter())),
          Math.max(0, Math.min(100, s.fuel + jitter() * 0.1)),
          s.temp + jitter() * 0.5,
          Math.max(0, Math.min(100, s.signal + jitter())),
          Math.max(0, Math.min(100, s.solar + jitter())),
          Math.max(0, 10 + r() * 90),
          Math.round(r() * 60), t
        );
      }
    });
  });
  telBatch();

  console.log(`✅ Seeded ${SATELLITES.length} satellites with 72h telemetry`);
  db.close();
}

seed().catch(console.error);
