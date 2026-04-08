import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Satellite, Activity, Zap, Thermometer, Radio, Fuel, MapPin, Clock, AlertTriangle, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { useSatellite, useCommands, usePasses } from '../hooks/useAPI.js';
import { statusColor, healthColor, typeIcon, typeLabel, fmt, fmtAlt, fmtTime, anomalyScore } from '../utils/index.js';
import TelemetryChart from './TelemetryChart.jsx';

const COMMANDS = ['REBOOT', 'SAFE_MODE', 'FULL_POWER', 'CALIBRATE', 'DOWNLINK_NOW', 'ATTITUDE_RESET', 'BATTERY_CHARGE', 'ANTENNA_DEPLOY'];

export default function SatelliteDetail({ satId, onClose }) {
  const { data, position, telemetry, track, anomaly, loading } = useSatellite(satId);
  const { send, sending, log } = useCommands();
  const [activeSection, setActiveSection] = useState('overview');
  const [userLat, setUserLat] = useState(12.97);
  const [userLon, setUserLon] = useState(77.59);
  const passes = usePasses(satId, userLat, userLon);

  if (loading && !data) return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
      style={{ position: 'absolute', top: 0, right: 0, width: 400, height: '100%', background: 'rgba(2,9,20,0.97)', borderLeft: '1px solid rgba(0,180,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ color: '#00d4ff', fontSize: 13 }}>Loading...</div>
    </motion.div>
  );

  if (!data) return null;
  const score = anomaly?.mlScore ?? anomalyScore(data);
  const scoreColor = score > 65 ? '#ff3d3d' : score > 40 ? '#ffab00' : '#00e676';
  const ruleAlerts = anomaly?.ruleAlerts || [];

  const sections = ['overview', 'telemetry', 'orbit', 'passes', 'commands', 'missions'];

  return (
    <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{ position: 'absolute', top: 0, right: 0, width: 400, height: '100%', background: 'rgba(2,8,22,0.98)', borderLeft: '1px solid rgba(0,180,255,0.2)', display: 'flex', flexDirection: 'column', zIndex: 200, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,180,255,0.12)', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: 'rgba(2,8,22,0.98)', zIndex: 10 }}>
        <span style={{ fontSize: 22 }}>{typeIcon(data.type)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{data.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{data.agency} · NORAD #{data.norad_id || '—'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(data.status), boxShadow: `0 0 8px ${statusColor(data.status)}` }} />
          <span style={{ fontSize: 11, color: statusColor(data.status), fontWeight: 600 }}>{data.status?.toUpperCase()}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, borderBottom: '1px solid rgba(0,180,255,0.1)', background: 'rgba(0,10,30,0.5)' }}>
        {[['Health', data.health, '%', '#00e676'], ['Battery', data.battery, '%', '#00d4ff'], ['Fuel', data.fuel, '%', '#7c4dff']].map(([l, v, u, c]) => (
          <div key={l} style={{ padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: 'monospace' }}>{fmt(v, 0)}<span style={{ fontSize: 11 }}>{u}</span></div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{l}</div>
            <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.max(0,Math.min(100,v))}%`, background: c, borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly alert */}
      {score > 40 && (
        <div style={{ margin: '10px 14px', padding: '8px 12px', background: `${scoreColor}14`, border: `1px solid ${scoreColor}44`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color={scoreColor} />
          <span style={{ fontSize: 12, color: scoreColor, fontWeight: 600 }}>ML Anomaly Score: {score}/100 — {score > 65 ? 'CRITICAL' : 'ELEVATED'}</span>
        </div>
      )}

      {ruleAlerts.length > 0 && ruleAlerts.map((a, i) => (
        <div key={i} style={{ margin: '4px 14px', padding: '6px 10px', background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.3)', borderRadius: 6, fontSize: 11, color: '#ff9944' }}>
          ⚠ {a.msg}
        </div>
      ))}

      {/* Section tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(0,180,255,0.1)', padding: '0 10px', scrollbarWidth: 'none' }}>
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)} style={{
            background: 'none', border: 'none', padding: '8px 10px', fontSize: 11, fontWeight: 600,
            color: activeSection === s ? '#00d4ff' : 'rgba(255,255,255,0.35)',
            borderBottom: activeSection === s ? '2px solid #00d4ff' : '2px solid transparent',
            cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em', fontFamily: 'inherit'
          }}>{s.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── OVERVIEW ── */}
        {activeSection === 'overview' && (
          <>
            <div>
              <div className="section-label">ORBITAL PARAMETERS</div>
              <div style={{ background: 'rgba(0,15,45,0.6)', borderRadius: 10, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                {[
                  ['Latitude', position ? `${fmt(position.lat)}°` : `${fmt(data.latitude)}°`],
                  ['Longitude', position ? `${fmt(position.lon)}°` : `${fmt(data.longitude)}°`],
                  ['Altitude', fmtAlt(position?.altitude ?? data.altitude_km)],
                  ['Velocity', `${fmt(position?.velocity ?? 0, 2)} km/s`],
                  ['Inclination', `${fmt(data.inclination)}°`],
                  ['Period', data.period_min ? `${fmt(data.period_min, 1)} min` : '—'],
                  ['Eclipse', position?.eclipse ? 'YES' : 'NO'],
                  ['Type', typeLabel(data.type)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>{k}</span>
                    <span style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label">TELEMETRY</div>
              <div style={{ background: 'rgba(0,15,45,0.6)', borderRadius: 10, padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                {[
                  ['Signal', `${fmt(data.signal_strength, 0)}%`, Radio],
                  ['Temperature', `${fmt(data.temperature, 1)}°C`, Thermometer],
                  ['Solar Power', `${fmt(data.solar_power, 0)}%`, Zap],
                  ['Data Rate', `${fmt(data.data_rate_mbps, 1)} Mbps`, Activity],
                  ['Uptime', `${data.uptime_days || 0}d`, Clock],
                  ['Last Update', fmtTime(data.updated_at), Clock],
                ].map(([k, v, Icon]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icon && <Icon size={12} color="rgba(0,180,255,0.5)" />}
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{k}</div>
                      <div style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 600 }}>{v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data.mission && (
              <div>
                <div className="section-label">MISSION</div>
                <div style={{ background: 'rgba(0,15,45,0.6)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  {data.mission}
                  {data.launch_date && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Launch: {data.launch_date}</div>}
                </div>
              </div>
            )}

            {data.tle_line1 && (
              <div>
                <div className="section-label">TLE ELEMENTS</div>
                <div style={{ background: 'rgba(0,5,18,0.9)', borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: 10, color: '#00d4ff', lineHeight: 1.8, wordBreak: 'break-all' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{data.name}</div>
                  <div>{data.tle_line1}</div>
                  <div>{data.tle_line2}</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TELEMETRY ── */}
        {activeSection === 'telemetry' && (
          <>
            <TelemetryChart data={telemetry} field="health" label="Health %" color="#00e676" />
            <TelemetryChart data={telemetry} field="battery" label="Battery %" color="#00d4ff" />
            <TelemetryChart data={telemetry} field="temperature" label="Temperature °C" color="#ff9944" />
            <TelemetryChart data={telemetry} field="signal_strength" label="Signal Strength %" color="#7c4dff" />
            <TelemetryChart data={telemetry} field="anomaly_score" label="Anomaly Score" color="#ff5252" />
          </>
        )}

        {/* ── ORBIT ── */}
        {activeSection === 'orbit' && (
          <div>
            <div className="section-label">GROUND TRACK ({track.length} points)</div>
            <GroundTrackMini track={track} />
            <div style={{ marginTop: 12 }}>
              <div className="section-label">ORBITAL ELEMENTS</div>
              <div style={{ background: 'rgba(0,15,45,0.6)', borderRadius: 10, padding: '10px 14px' }}>
                {[
                  ['Mean Motion', data.mean_motion ? `${fmt(data.mean_motion, 5)} rev/day` : '—'],
                  ['Eccentricity', data.eccentricity ? fmt(data.eccentricity, 6) : '—'],
                  ['Apogee', data.apogee_km ? `${fmt(data.apogee_km, 0)} km` : '—'],
                  ['Perigee', data.perigee_km ? `${fmt(data.perigee_km, 0)} km` : '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                    <span style={{ fontSize: 12, color: '#00d4ff', fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PASSES ── */}
        {activeSection === 'passes' && (
          <>
            <div>
              <div className="section-label">OBSERVER LOCATION</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Latitude</label>
                  <input type="number" value={userLat} onChange={e => setUserLat(parseFloat(e.target.value))} className="input" style={{ padding: '6px 8px', fontSize: 12, marginTop: 3 }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Longitude</label>
                  <input type="number" value={userLon} onChange={e => setUserLon(parseFloat(e.target.value))} className="input" style={{ padding: '6px 8px', fontSize: 12, marginTop: 3 }} />
                </div>
              </div>
            </div>
            {passes.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                {data.tle_line1 ? 'No passes in next 24h above 5° elevation' : 'No TLE data — cannot compute passes'}
              </div>
            ) : passes.map((p, i) => (
              <div key={i} style={{ background: 'rgba(0,20,55,0.6)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#00e676', fontWeight: 600 }}>PASS {i+1}</span>
                  <span style={{ fontSize: 12, color: '#00d4ff' }}>Max El: {p.maxElevation}°</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  AOS: {new Date(p.aos).toLocaleTimeString()} · LOS: {new Date(p.los).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Duration: {Math.round(p.duration/60)}m {p.duration%60}s</div>
              </div>
            ))}
          </>
        )}

        {/* ── COMMANDS ── */}
        {activeSection === 'commands' && (
          <>
            <div>
              <div className="section-label">SEND COMMAND</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {COMMANDS.map(cmd => (
                  <button key={cmd} onClick={() => send(satId, cmd)} disabled={sending} className="btn btn-ghost"
                    style={{ fontSize: 10, padding: '6px 8px', letterSpacing: '0.04em', fontFamily: 'monospace', justifyContent: 'center' }}>
                    <Send size={10} />{cmd}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="section-label">COMMAND LOG</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                {log.filter(c => c.satellite_id === satId || !satId).slice(0, 15).map((c, i) => (
                  <div key={i} style={{ background: 'rgba(0,10,30,0.7)', borderRadius: 6, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.status === 'acknowledged' ? '#00e676' : c.status === 'sent' ? '#ffab00' : '#546e7a', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>{c.command}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>{fmtTime(c.created_at)}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MISSIONS ── */}
        {activeSection === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.missions || []).length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>No missions assigned</div>
            ) : (data.missions || []).map((m, i) => (
              <div key={i} style={{ background: 'rgba(0,15,45,0.7)', border: '1px solid rgba(0,180,255,0.12)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: m.status === 'active' ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.08)', color: m.status === 'active' ? '#00e676' : 'rgba(255,255,255,0.4)' }}>{m.status}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{m.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${m.progress}%`, background: '#00d4ff', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#00d4ff', fontFamily: 'monospace' }}>{m.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GroundTrackMini({ track }) {
  if (!track || track.length < 2) return <div style={{ height: 100, background: 'rgba(0,10,30,0.5)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No track data</div>;
  const W = 350, H = 120;
  const toXY = (lat, lon) => [(lon+180)/360*W, (90-lat)/180*H];
  const pts = track.map(p => toXY(p.lat, p.lon));
  let d = '';
  pts.forEach(([x, y], i) => {
    if (i === 0 || Math.abs(x - pts[i-1]?.[0]) > W/2) d += `M${x} ${y}`;
    else d += ` L${x} ${y}`;
  });
  const [cx, cy] = toXY(track[Math.floor(track.length/2)].lat, track[Math.floor(track.length/2)].lon);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, background: 'rgba(0,8,22,0.8)', borderRadius: 8, border: '1px solid rgba(0,180,255,0.12)' }}>
      <rect width={W} height={H} fill="rgba(0,5,18,0.6)" />
      {[-180,-90,0,90,180].map(lon => <line key={lon} x1={(lon+180)/360*W} y1={0} x2={(lon+180)/360*W} y2={H} stroke="rgba(0,180,255,0.06)" strokeWidth="0.5" />)}
      {[-60,-30,0,30,60].map(lat => <line key={lat} x1={0} y1={(90-lat)/180*H} x2={W} y2={(90-lat)/180*H} stroke="rgba(0,180,255,0.06)" strokeWidth="0.5" />)}
      <path d={d} fill="none" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="#00d4ff" />
      <circle cx={cx} cy={cy} r="8" fill="none" stroke="rgba(0,212,255,0.4)" strokeWidth="1" />
    </svg>
  );
}
