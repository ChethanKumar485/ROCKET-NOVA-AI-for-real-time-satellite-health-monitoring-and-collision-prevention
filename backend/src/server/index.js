import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { rateLimit } from 'express-rate-limit';
import cron from 'node-cron';
import { initDB, getDB } from '../database/init.js';
import { propagate, batchPropagate, groundTrack, calculatePasses, conjunctionAnalysis } from '../services/sgp4Service.js';
import { scoreAnomaly, checkRuleBasedAnomalies, trainFleetModel } from '../services/anomalyService.js';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const PORT = process.env.PORT || 3002;

// ─── Middleware ────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60000, max: 500, standardHeaders: true }));

// ─── DB Init ───────────────────────────────────────────────
const db = initDB();

// ─── WebSocket broadcast ───────────────────────────────────
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', (ws) => {
  console.log('🔌 WS client connected');
  ws.send(JSON.stringify({ type: 'connected', data: { msg: 'Rocket Nova WS connected', ts: Date.now() } }));
});

// ─── Helper: get all satellites with orbital data ──────────
function getAllSatellites() {
  return db.prepare(`
    SELECT s.*, o.tle_line1, o.tle_line2, o.inclination, o.altitude_km, o.period_min,
           o.apogee_km, o.perigee_km, o.eccentricity
    FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id
    ORDER BY s.name`).all();
}

// ─── Train anomaly model on startup ───────────────────────
setTimeout(() => {
  const sats = getAllSatellites();
  trainFleetModel(sats);
  console.log(`🤖 Anomaly model trained on ${sats.length} satellites`);
}, 2000);

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

// ─── Health ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const sats = db.prepare('SELECT COUNT(*) as c FROM satellites').get();
  const tles = db.prepare("SELECT COUNT(*) as c FROM orbital_data WHERE tle_line1 IS NOT NULL AND tle_line1 != ''").get();
  res.json({ status: 'ok', satellites: sats.c, tleCount: tles.c, uptime: process.uptime(), ts: new Date().toISOString() });
});

// ─── GET /api/satellites ──────────────────────────────────
app.get('/api/satellites', (req, res) => {
  try {
    const { search, type, agency, status, sortBy = 'name', limit = 200, offset = 0 } = req.query;
    let q = `SELECT s.*, o.tle_line1, o.tle_line2, o.inclination, o.altitude_km, o.period_min, o.eccentricity
             FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE 1=1`;
    const params = [];
    if (search) { q += ` AND (s.name LIKE ? OR s.agency LIKE ? OR s.id LIKE ?)`; const l = `%${search}%`; params.push(l, l, l); }
    if (type) { q += ` AND s.type = ?`; params.push(type); }
    if (agency) { q += ` AND s.agency LIKE ?`; params.push(`%${agency}%`); }
    if (status) { q += ` AND s.status = ?`; params.push(status); }
    const orderMap = { name: 's.name', health: 's.health DESC', battery: 's.battery DESC', altitude: 'o.altitude_km DESC', id: 's.id' };
    q += ` ORDER BY ${orderMap[sortBy] || 's.name'} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    const sats = db.prepare(q).all(...params);
    const total = db.prepare('SELECT COUNT(*) as c FROM satellites').get().c;
    res.json({ satellites: sats, total, returned: sats.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/satellites/:id ──────────────────────────────
app.get('/api/satellites/:id', (req, res) => {
  const sat = db.prepare(`SELECT s.*, o.* FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE s.id = ?`).get(req.params.id);
  if (!sat) return res.status(404).json({ error: 'Satellite not found' });
  const alerts = db.prepare(`SELECT * FROM alerts WHERE satellite_id = ? AND resolved = 0 ORDER BY created_at DESC LIMIT 10`).all(req.params.id);
  const missions = db.prepare(`SELECT * FROM missions WHERE satellite_id = ? ORDER BY priority LIMIT 5`).all(req.params.id);
  res.json({ ...sat, alerts, missions });
});

// ─── GET /api/satellites/:id/position ────────────────────
app.get('/api/satellites/:id/position', (req, res) => {
  const sat = db.prepare(`SELECT s.id, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE s.id = ?`).get(req.params.id);
  if (!sat) return res.status(404).json({ error: 'Satellite not found' });
  if (!sat.tle_line1) return res.status(400).json({ error: 'No TLE data for satellite', satelliteId: sat.id });
  try {
    const pos = propagate(sat.tle_line1, sat.tle_line2, req.query.at ? new Date(req.query.at) : new Date());
    res.json({ ...pos, satelliteId: sat.id, timestamp: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/satellites/positions/batch ─────────────────
app.get('/api/satellites/positions/batch', (req, res) => {
  const ids = req.query.ids?.split(',') || [];
  if (!ids.length) { const sats = getAllSatellites(); ids.push(...sats.map(s => s.id)); }
  const sats = db.prepare(`SELECT s.id, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id`).all();
  const results = {};
  sats.forEach(sat => {
    if (!sat.tle_line1) return;
    try {
      const pos = propagate(sat.tle_line1, sat.tle_line2);
      results[sat.id] = { ...pos, satelliteId: sat.id, timestamp: new Date().toISOString() };
    } catch {}
  });
  res.json(results);
});

// ─── GET /api/satellites/:id/track ───────────────────────
app.get('/api/satellites/:id/track', (req, res) => {
  const sat = db.prepare(`SELECT s.id, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE s.id = ?`).get(req.params.id);
  if (!sat?.tle_line1) return res.status(400).json({ error: 'No TLE data' });
  try {
    const track = groundTrack(sat.tle_line1, sat.tle_line2, parseInt(req.query.minutes || 90), parseInt(req.query.step || 2));
    res.json({ satelliteId: sat.id, track });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/satellites/:id/passes ──────────────────────
app.get('/api/satellites/:id/passes', (req, res) => {
  const sat = db.prepare(`SELECT s.id, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE s.id = ?`).get(req.params.id);
  if (!sat?.tle_line1) return res.status(400).json({ error: 'No TLE data' });
  const { lat = 0, lon = 0, alt = 0 } = req.query;
  try {
    const passes = calculatePasses(sat.tle_line1, sat.tle_line2, parseFloat(lat), parseFloat(lon), parseFloat(alt), parseInt(req.query.hours || 24));
    res.json({ satelliteId: sat.id, passes, station: { lat, lon, alt } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/satellites/:id/telemetry ───────────────────
app.get('/api/satellites/:id/telemetry', (req, res) => {
  const { hours = 24, limit = 200 } = req.query;
  const since = new Date(Date.now() - parseInt(hours) * 3600000).toISOString();
  const data = db.prepare(`SELECT * FROM telemetry_history WHERE satellite_id = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT ?`)
    .all(req.params.id, since, parseInt(limit));
  res.json({ satelliteId: req.params.id, data: data.reverse(), count: data.length });
});

// ─── POST /api/satellites/:id/telemetry ──────────────────
app.post('/api/satellites/:id/telemetry', (req, res) => {
  const { health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps } = req.body;
  const score = scoreAnomaly({ health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps });
  db.prepare(`INSERT INTO telemetry_history (satellite_id, health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps, anomaly_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps, score);
  db.prepare(`UPDATE satellites SET health=?, battery=?, fuel=?, temperature=?, signal_strength=?, solar_power=?, data_rate_mbps=?, updated_at=datetime('now') WHERE id=?`)
    .run(health, battery, fuel, temperature, signal_strength, solar_power, data_rate_mbps, req.params.id);
  // Broadcast update
  broadcast('telemetry', { satelliteId: req.params.id, health, battery, fuel, temperature, signal_strength, anomaly_score: score });
  res.json({ success: true, anomaly_score: score });
});

// ─── GET /api/satellites/:id/anomalies ───────────────────
app.get('/api/satellites/:id/anomalies', (req, res) => {
  const sat = db.prepare(`SELECT * FROM satellites WHERE id = ?`).get(req.params.id);
  if (!sat) return res.status(404).json({ error: 'Not found' });
  const mlScore = scoreAnomaly(sat);
  const ruleAlerts = checkRuleBasedAnomalies(sat);
  const history = db.prepare(`SELECT anomaly_score, timestamp FROM telemetry_history WHERE satellite_id = ? ORDER BY timestamp DESC LIMIT 48`)
    .all(req.params.id);
  res.json({ satelliteId: req.params.id, mlScore, severity: mlScore > 70 ? 'critical' : mlScore > 45 ? 'high' : mlScore > 25 ? 'medium' : 'low', ruleAlerts, scoreHistory: history.reverse() });
});

// ─── GET /api/fleet/anomalies ─────────────────────────────
app.get('/api/fleet/anomalies', (req, res) => {
  const sats = getAllSatellites();
  const results = sats.map(s => ({
    id: s.id, name: s.name, agency: s.agency,
    mlScore: scoreAnomaly(s),
    ruleAlerts: checkRuleBasedAnomalies(s),
    status: s.status
  })).sort((a, b) => b.mlScore - a.mlScore);
  res.json({ anomalies: results, modelAge: Date.now() });
});

// ─── GET /api/fleet/stats ─────────────────────────────────
app.get('/api/fleet/stats', (req, res) => {
  const stats = db.prepare(`SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status='operational' THEN 1 ELSE 0 END) as operational,
    SUM(CASE WHEN status='degraded' THEN 1 ELSE 0 END) as degraded,
    SUM(CASE WHEN status='warning' THEN 1 ELSE 0 END) as warning,
    ROUND(AVG(health),1) as avg_health,
    ROUND(AVG(battery),1) as avg_battery,
    ROUND(AVG(signal_strength),1) as avg_signal,
    MIN(health) as min_health,
    MAX(health) as max_health
    FROM satellites`).get();
  const tleCount = db.prepare(`SELECT COUNT(*) as c FROM orbital_data WHERE tle_line1 IS NOT NULL AND tle_line1 != ''`).get().c;
  const alerts = db.prepare(`SELECT COUNT(*) as c FROM alerts WHERE resolved = 0`).get().c;
  res.json({ ...stats, tleCount, unresolvedAlerts: alerts, timestamp: new Date().toISOString() });
});

// ─── GET /api/conjunctions ────────────────────────────────
app.get('/api/conjunctions', (req, res) => {
  const existing = db.prepare(`
    SELECT cj.*, sa.name as sat_a_name, sb.name as sat_b_name
    FROM conjunctions cj JOIN satellites sa ON cj.sat_a_id = sa.id JOIN satellites sb ON cj.sat_b_id = sb.id
    WHERE cj.resolved = 0 ORDER BY cj.miss_distance_km ASC LIMIT 20`).all();
  res.json({ conjunctions: existing, count: existing.length });
});

// ─── GET /api/conjunctions/compute ───────────────────────
app.get('/api/conjunctions/compute', (req, res) => {
  const sats = db.prepare(`SELECT s.id, s.name, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE o.tle_line1 IS NOT NULL`).all();
  const results = [];
  for (let i = 0; i < Math.min(sats.length, 12); i++) {
    for (let j = i + 1; j < Math.min(sats.length, 12); j++) {
      try {
        const r = conjunctionAnalysis(sats[i], sats[j], 12);
        if (r && r.minDistance < 200) {
          results.push({ satA: sats[i].name, satAId: sats[i].id, satB: sats[j].name, satBId: sats[j].id, ...r });
          db.prepare(`INSERT OR REPLACE INTO conjunctions (sat_a_id, sat_b_id, tca, miss_distance_km, risk_level) VALUES (?,?,?,?,?)`)
            .run(sats[i].id, sats[j].id, r.tca, r.minDistance, r.riskLevel);
        }
      } catch {}
    }
  }
  res.json({ conjunctions: results.sort((a,b) => a.minDistance - b.minDistance) });
});

// ─── GET /api/alerts ──────────────────────────────────────
app.get('/api/alerts', (req, res) => {
  const { resolved = 0, limit = 50 } = req.query;
  const alerts = db.prepare(`
    SELECT a.*, s.name as satellite_name FROM alerts a JOIN satellites s ON a.satellite_id = s.id
    WHERE a.resolved = ? ORDER BY a.created_at DESC LIMIT ?`).all(parseInt(resolved), parseInt(limit));
  res.json({ alerts, count: alerts.length });
});

// ─── POST /api/alerts/:id/resolve ────────────────────────
app.post('/api/alerts/:id/resolve', (req, res) => {
  db.prepare(`UPDATE alerts SET resolved=1, resolved_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ─── GET /api/missions ────────────────────────────────────
app.get('/api/missions', (req, res) => {
  const missions = db.prepare(`SELECT m.*, s.name as satellite_name FROM missions m JOIN satellites s ON m.satellite_id = s.id ORDER BY m.priority, m.created_at DESC LIMIT 50`).all();
  res.json({ missions, count: missions.length });
});

// ─── GET /api/ground-stations ────────────────────────────
app.get('/api/ground-stations', (req, res) => {
  res.json({ stations: db.prepare('SELECT * FROM ground_stations').all() });
});

// ─── GET /api/command-log ────────────────────────────────
app.get('/api/command-log', (req, res) => {
  const { satelliteId, limit = 30 } = req.query;
  let q = `SELECT c.*, s.name as satellite_name FROM command_log c JOIN satellites s ON c.satellite_id = s.id`;
  const params = [];
  if (satelliteId) { q += ' WHERE c.satellite_id = ?'; params.push(satelliteId); }
  q += ' ORDER BY c.created_at DESC LIMIT ?'; params.push(parseInt(limit));
  res.json({ commands: db.prepare(q).all(...params) });
});

// ─── POST /api/command ───────────────────────────────────
app.post('/api/command', (req, res) => {
  const { satelliteId, command, parameters, operator = 'operator' } = req.body;
  if (!satelliteId || !command) return res.status(400).json({ error: 'satelliteId and command required' });
  const id = db.prepare(`INSERT INTO command_log (satellite_id, command, parameters, status, operator, sent_at) VALUES (?,?,?,?,?,datetime('now'))`)
    .run(satelliteId, command, JSON.stringify(parameters), 'sent', operator).lastInsertRowid;
  broadcast('command', { id, satelliteId, command, operator, ts: Date.now() });
  // Simulate ACK after 2s
  setTimeout(() => {
    db.prepare(`UPDATE command_log SET status='acknowledged', ack_at=datetime('now'), response='ACK received' WHERE id=?`).run(id);
    broadcast('command_ack', { id, satelliteId, command });
  }, 2000);
  res.json({ success: true, commandId: id });
});

// ─── GET /api/agencies ───────────────────────────────────
app.get('/api/agencies', (req, res) => {
  const agencies = db.prepare(`SELECT agency, COUNT(*) as count FROM satellites GROUP BY agency ORDER BY count DESC`).all();
  res.json({ agencies });
});

// ─── GET /api/reports/summary ────────────────────────────
app.get('/api/reports/summary', (req, res) => {
  const stats = db.prepare(`SELECT * FROM satellites`).all();
  const topAnomalies = stats.map(s => ({ id: s.id, name: s.name, score: scoreAnomaly(s) })).sort((a, b) => b.score - a.score).slice(0, 5);
  const critical = stats.filter(s => s.health < 60 || s.battery < 25).map(s => s.name);
  res.json({
    generated: new Date().toISOString(),
    fleet: { total: stats.length, operational: stats.filter(s => s.status === 'operational').length, degraded: stats.filter(s => s.status === 'degraded').length },
    avgHealth: Math.round(stats.reduce((a, s) => a + s.health, 0) / stats.length),
    topAnomalies, critical,
    recommendations: [
      critical.length > 0 ? `Immediate attention required for: ${critical.slice(0,3).join(', ')}` : 'Fleet health nominal',
      topAnomalies[0]?.score > 70 ? `High anomaly score detected on ${topAnomalies[0].name}` : 'No critical anomalies',
      'Recommend scheduling maintenance window for satellites with < 30% fuel'
    ]
  });
});

// ─── Background jobs ──────────────────────────────────────

// Update positions every 60s
cron.schedule('*/60 * * * * *', () => {
  try {
    const sats = db.prepare(`SELECT s.id, o.tle_line1, o.tle_line2 FROM satellites s LEFT JOIN orbital_data o ON s.id = o.satellite_id WHERE o.tle_line1 IS NOT NULL`).all();
    const insertPos = db.prepare(`INSERT INTO positions (satellite_id, latitude, longitude, altitude_km, velocity_km_s, eclipse) VALUES (?,?,?,?,?,?)`);
    const batch = db.transaction(() => {
      sats.forEach(sat => {
        try {
          const p = propagate(sat.tle_line1, sat.tle_line2);
          insertPos.run(sat.id, p.lat, p.lon, p.altitude, p.velocity, p.eclipse ? 1 : 0);
        } catch {}
      });
    });
    batch();
    broadcast('positions_updated', { count: sats.length, ts: Date.now() });
  } catch {}
});

// Simulate telemetry every 30s
cron.schedule('*/30 * * * * *', () => {
  try {
    const sats = db.prepare('SELECT * FROM satellites').all();
    const updateSat = db.prepare(`UPDATE satellites SET health=?, battery=?, temperature=?, signal_strength=?, updated_at=datetime('now') WHERE id=?`);
    const insertTel = db.prepare(`INSERT INTO telemetry_history (satellite_id, health, battery, fuel, temperature, signal_strength, solar_power, anomaly_score) VALUES (?,?,?,?,?,?,?,?)`);

    const batch = db.transaction(() => {
      sats.forEach(sat => {
        const jitter = (v, range = 2) => Math.max(0, Math.min(100, v + (Math.random() - 0.5) * range));
        const newHealth = jitter(sat.health, 0.5);
        const newBatt = jitter(sat.battery, 1);
        const newTemp = sat.temperature + (Math.random() - 0.5) * 0.3;
        const newSignal = jitter(sat.signal_strength, 1.5);
        const score = scoreAnomaly({ ...sat, health: newHealth, battery: newBatt, temperature: newTemp, signal_strength: newSignal });
        updateSat.run(newHealth, newBatt, newTemp, newSignal, sat.id);
        insertTel.run(sat.id, newHealth, newBatt, sat.fuel, newTemp, newSignal, sat.solar_power || 90, score);

        // Check for new alerts
        checkRuleBasedAnomalies({ ...sat, health: newHealth, battery: newBatt, temperature: newTemp, signal_strength: newSignal })
          .forEach(alert => {
            const exists = db.prepare(`SELECT id FROM alerts WHERE satellite_id=? AND type=? AND resolved=0`).get(sat.id, alert.feature);
            if (!exists) {
              db.prepare(`INSERT INTO alerts (satellite_id, type, severity, category, message) VALUES (?,?,?,?,?)`)
                .run(sat.id, alert.feature, alert.severity, 'telemetry', alert.msg);
              broadcast('alert', { satelliteId: sat.id, satelliteName: sat.name, ...alert });
            }
          });
      });
    });
    batch();
    broadcast('telemetry_update', { ts: Date.now(), count: sats.length });
  } catch (e) { console.error('Telemetry sim error:', e.message); }
});

// Retrain anomaly model every 30min
cron.schedule('0 */30 * * * *', () => {
  const sats = getAllSatellites();
  trainFleetModel(sats);
  console.log('🤖 Anomaly model retrained');
});

// ─── Start ────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Rocket Nova Backend v2.0`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/satellites`);
  console.log(`   GET  /api/satellites/:id`);
  console.log(`   GET  /api/satellites/:id/position`);
  console.log(`   GET  /api/satellites/:id/track`);
  console.log(`   GET  /api/satellites/:id/passes`);
  console.log(`   GET  /api/satellites/:id/telemetry`);
  console.log(`   GET  /api/satellites/:id/anomalies`);
  console.log(`   GET  /api/satellites/positions/batch`);
  console.log(`   GET  /api/fleet/anomalies`);
  console.log(`   GET  /api/fleet/stats`);
  console.log(`   GET  /api/conjunctions`);
  console.log(`   GET  /api/alerts`);
  console.log(`   GET  /api/missions`);
  console.log(`   GET  /api/ground-stations`);
  console.log(`   POST /api/command`);
  console.log(`   GET  /api/reports/summary`);
  console.log(`\n✅ Background jobs: positions (60s), telemetry (30s), ML retrain (30m)`);
});

export default app;
