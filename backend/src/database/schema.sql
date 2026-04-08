-- ============================================================
-- ROCKET NOVA v2.0 - Complete Database Schema
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ─── SATELLITES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS satellites (
  id              TEXT PRIMARY KEY,
  norad_id        INTEGER UNIQUE,
  name            TEXT NOT NULL,
  agency          TEXT DEFAULT 'Unknown',
  type            TEXT DEFAULT 'unknown',
  status          TEXT DEFAULT 'operational',
  launch_date     TEXT,
  mission         TEXT,
  description     TEXT,
  health          REAL DEFAULT 100.0,
  battery         REAL DEFAULT 100.0,
  fuel            REAL DEFAULT 100.0,
  temperature     REAL DEFAULT 20.0,
  signal_strength REAL DEFAULT 95.0,
  solar_power     REAL DEFAULT 100.0,
  data_rate_mbps  REAL DEFAULT 10.0,
  uptime_days     INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ─── ORBITAL DATA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orbital_data (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id) ON DELETE CASCADE,
  tle_line1       TEXT,
  tle_line2       TEXT,
  epoch           TEXT,
  mean_motion     REAL,
  eccentricity    REAL,
  inclination     REAL,
  ra_of_asc_node  REAL,
  arg_of_perigee  REAL,
  mean_anomaly    REAL,
  bstar           REAL,
  altitude_km     REAL,
  period_min      REAL,
  apogee_km       REAL,
  perigee_km      REAL,
  updated_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(satellite_id)
);

-- ─── POSITIONS (time-series) ────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id) ON DELETE CASCADE,
  latitude        REAL,
  longitude       REAL,
  altitude_km     REAL,
  velocity_km_s   REAL,
  azimuth         REAL,
  elevation       REAL,
  footprint_km    REAL,
  eclipse         INTEGER DEFAULT 0,
  timestamp       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pos_sat_time ON positions(satellite_id, timestamp DESC);

-- ─── TELEMETRY HISTORY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id) ON DELETE CASCADE,
  health          REAL,
  battery         REAL,
  fuel            REAL,
  temperature     REAL,
  signal_strength REAL,
  solar_power     REAL,
  data_rate_mbps  REAL,
  altitude_km     REAL,
  velocity_km_s   REAL,
  anomaly_score   REAL DEFAULT 0,
  timestamp       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tel_sat_time ON telemetry_history(satellite_id, timestamp DESC);

-- ─── MISSIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  type            TEXT DEFAULT 'observation',
  status          TEXT DEFAULT 'planned',
  priority        INTEGER DEFAULT 3,
  start_date      TEXT,
  end_date        TEXT,
  target_lat      REAL,
  target_lon      REAL,
  progress        REAL DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ─── ALERTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id) ON DELETE CASCADE,
  type            TEXT,
  severity        TEXT DEFAULT 'info',
  category        TEXT DEFAULT 'system',
  message         TEXT,
  details         TEXT,
  resolved        INTEGER DEFAULT 0,
  resolved_at     TEXT,
  acknowledged    INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(satellite_id, resolved);

-- ─── CONJUNCTIONS (collision risks) ─────────────────────────
CREATE TABLE IF NOT EXISTS conjunctions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sat_a_id        TEXT REFERENCES satellites(id),
  sat_b_id        TEXT REFERENCES satellites(id),
  tca             TEXT,
  miss_distance_km REAL,
  probability     REAL,
  relative_vel_km_s REAL,
  risk_level      TEXT DEFAULT 'low',
  resolved        INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ─── GROUND STATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ground_stations (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  location        TEXT,
  latitude        REAL,
  longitude       REAL,
  altitude_m      REAL DEFAULT 0,
  status          TEXT DEFAULT 'active',
  antenna_size_m  REAL,
  frequency_band  TEXT,
  max_elevation   REAL DEFAULT 90,
  min_elevation   REAL DEFAULT 5
);

-- ─── PASS PREDICTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pass_predictions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id),
  station_id      TEXT REFERENCES ground_stations(id),
  aos             TEXT,
  los             TEXT,
  max_elevation   REAL,
  duration_sec    INTEGER,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ─── MANEUVERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maneuvers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id),
  type            TEXT,
  status          TEXT DEFAULT 'planned',
  delta_v_m_s     REAL,
  burn_duration_s REAL,
  scheduled_at    TEXT,
  executed_at     TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ─── COMMAND LOG ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS command_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id),
  command         TEXT NOT NULL,
  parameters      TEXT,
  status          TEXT DEFAULT 'pending',
  operator        TEXT DEFAULT 'system',
  sent_at         TEXT,
  ack_at          TEXT,
  response        TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ─── ANOMALY EVENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomaly_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  satellite_id    TEXT REFERENCES satellites(id),
  feature         TEXT,
  value           REAL,
  expected_min    REAL,
  expected_max    REAL,
  anomaly_score   REAL,
  severity        TEXT DEFAULT 'low',
  auto_resolved   INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- ─── REPORTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT,
  type            TEXT,
  satellite_id    TEXT,
  content_json    TEXT,
  generated_at    TEXT DEFAULT (datetime('now'))
);

-- ─── GROUND STATIONS SEED DATA ───────────────────────────────
INSERT OR IGNORE INTO ground_stations VALUES
  ('GS-HOUSTON','Johnson Space Center','Houston, TX, USA',29.5602,-95.0900,14.0,'active',18.0,'S/X-band',90,5),
  ('GS-MADRID','ESAC','Madrid, Spain',40.4452,-3.9527,664.0,'active',35.0,'S/X-band',90,5),
  ('GS-GOLDSTONE','DSN Goldstone','Mojave Desert, CA',35.4260,-116.8900,1036.0,'active',70.0,'S/X/Ka-band',90,5),
  ('GS-CANBERRA','DSN Canberra','Canberra, Australia',-35.4017,148.9816,689.0,'active',70.0,'S/X/Ka-band',90,5),
  ('GS-BANGALORE','ISRO Bangalore','Bangalore, India',13.0296,77.5700,921.0,'active',11.0,'S-band',90,5),
  ('GS-KIRUNA','ESRANGE','Kiruna, Sweden',67.8785,21.0485,418.0,'active',13.0,'S/X-band',90,5);
