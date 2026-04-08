// ─── Color utilities ──────────────────────────────────────
export function statusColor(status) {
  const map = { operational: '#00e676', degraded: '#ffab00', warning: '#ff5252', offline: '#546e7a' };
  return map[status] || '#546e7a';
}

export function healthColor(v) {
  if (v >= 80) return '#00e676';
  if (v >= 60) return '#69f0ae';
  if (v >= 40) return '#ffab00';
  if (v >= 20) return '#ff6d00';
  return '#ff3d3d';
}

export function severityColor(s) {
  const map = { critical: '#ff3d3d', high: '#ff6d00', medium: '#ffd600', low: '#00e676', info: '#00d4ff' };
  return map[s] || '#00d4ff';
}

// ─── Type utilities ───────────────────────────────────────
export function typeIcon(type) {
  const map = {
    space_station: '🛸', science: '🔭', comm: '📡', navigation: '🧭',
    earth_obs: '🌍', weather: '🌦', imaging: '📷', unknown: '🛰'
  };
  return map[type] || map.unknown;
}

export function typeLabel(type) {
  const map = {
    space_station: 'Space Station', science: 'Science', comm: 'Comms',
    navigation: 'Navigation', earth_obs: 'Earth Obs.', weather: 'Weather',
    imaging: 'Imaging', unknown: 'Unknown'
  };
  return map[type] || type;
}

// ─── Number formatting ────────────────────────────────────
export function fmt(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(decimals);
}

export function fmtAlt(km) {
  if (km > 35000) return `${fmt(km/1000, 0)}K km (GEO)`;
  if (km > 2000) return `${fmt(km, 0)} km (MEO)`;
  return `${fmt(km, 0)} km (LEO)`;
}

export function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString();
}

export function fmtDuration(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s}s`;
}

// ─── Seeded random ────────────────────────────────────────
export function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ─── Anomaly score from telemetry fields ─────────────────
export function anomalyScore(sat) {
  const features = [sat.health/100, sat.battery/100, (sat.temperature+20)/120, sat.signal_strength/100];
  const mean = features.reduce((a,b) => a+b,0) / features.length;
  const variance = features.reduce((a,b) => a+(b-mean)**2,0) / features.length;
  return Math.min(100, Math.round(variance * 400 + Math.max(...features.map(f => Math.abs(f-mean))) * 80));
}
