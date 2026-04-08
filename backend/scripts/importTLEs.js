/**
 * Import TLEs from Celestrak for satellites already in DB
 * Usage: node scripts/importTLEs.js
 */
import { initDB, getDB } from '../src/database/init.js';

const CELESTRAK_GROUPS = [
  'https://celestrak.org/SOCRATES/query.php?CODE=ALL&ALT1=600&ALT2=700&NAME=&LIMIT=100&SORT=1',
  'https://celestrak.org/SOCRATES/query.php?CODE=STARLINK&LIMIT=100',
];

const CELESTRAK_TLE_URLS = [
  'https://celestrak.org/SOCRATES/query.php?CODE=STATIONS&FORMAT=TLE',
  'https://celestrak.org/SOCRATES/query.php?CODE=ACTIVE&FORMAT=TLE',
];

async function fetchTLEs(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    const tles = [];
    for (let i = 0; i + 2 < lines.length; i += 3) {
      if (lines[i+1].startsWith('1 ') && lines[i+2].startsWith('2 ')) {
        const norad = parseInt(lines[i+1].substring(2, 7).trim());
        tles.push({ name: lines[i].replace('0 ', '').trim(), tle1: lines[i+1], tle2: lines[i+2], norad });
      }
    }
    return tles;
  } catch (e) {
    console.error('Fetch error:', url, e.message);
    return [];
  }
}

async function main() {
  const db = initDB();
  const dbSats = db.prepare('SELECT id, norad_id FROM satellites WHERE norad_id IS NOT NULL').all();
  const noradMap = new Map(dbSats.map(s => [s.norad_id, s.id]));
  
  console.log(`📡 Fetching TLEs for ${dbSats.length} satellites...`);
  
  const updateOrbit = db.prepare(`INSERT OR REPLACE INTO orbital_data (satellite_id, tle_line1, tle_line2, inclination, altitude_km, period_min, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`);
  
  let updated = 0;
  
  for (const url of CELESTRAK_TLE_URLS) {
    const tles = await fetchTLEs(url);
    console.log(`  Got ${tles.length} TLEs from ${url.slice(0, 60)}`);
    
    const batch = db.transaction(() => {
      tles.forEach(tle => {
        if (!noradMap.has(tle.norad)) return;
        const satId = noradMap.get(tle.norad);
        try {
          const inc = parseFloat(tle.tle2.split(/\s+/)[2]);
          const n = parseFloat(tle.tle2.split(/\s+/)[7]);
          const period = 1440 / n;
          const a = Math.pow(398600.4418 / (n * 2*Math.PI/86400)**2, 1/3);
          const alt = a - 6371;
          updateOrbit.run(satId, tle.tle1, tle.tle2, inc, alt, period);
          updated++;
        } catch {}
      });
    });
    batch();
  }
  
  console.log(`✅ Updated ${updated} satellite TLEs`);
  db.close();
}

main().catch(console.error);
