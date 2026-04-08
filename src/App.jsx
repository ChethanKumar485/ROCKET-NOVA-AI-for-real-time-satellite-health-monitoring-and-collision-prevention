import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Map, Satellite, BarChart2, Bot, Bell, FileText, RefreshCw, Wifi, WifiOff, Activity } from 'lucide-react';
import OrbitalMap from './components/OrbitalMap.jsx';
import SatelliteDetail from './components/SatelliteDetail.jsx';
import AIChat from './components/AIChat.jsx';
import Fleet from './pages/Fleet.jsx';
import Analytics from './pages/Analytics.jsx';
import Alerts from './pages/Alerts.jsx';
import Reports from './pages/Reports.jsx';
import { useFleet, useAlerts, useConjunctions } from './hooks/useAPI.js';
import { apiFetch } from './hooks/useAPI.js';
import { statusColor, typeIcon } from './utils/index.js';
import './styles/global.css';

const TABS = [
  { id: 'map',       label: 'ORBITAL MAP',  icon: Map },
  { id: 'fleet',     label: 'FLEET',        icon: Satellite },
  { id: 'analytics', label: 'ANALYTICS',    icon: BarChart2 },
  { id: 'ai',        label: 'NOVA AI',      icon: Bot },
  { id: 'alerts',    label: 'ALERTS',       icon: Bell },
  { id: 'reports',   label: 'REPORTS',      icon: FileText },
];

function StatBadge({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 12px', borderRight: '1px solid rgba(0,180,255,0.08)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'monospace', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 2, letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function LiveIndicator({ connected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#00e676' : '#ff5252', boxShadow: connected ? '0 0 8px #00e676' : 'none' }} className="animate-pulse-dot" />
      <span style={{ fontSize: 10, color: connected ? '#00e676' : '#ff5252', fontWeight: 600, letterSpacing: '0.04em' }}>{connected ? 'LIVE' : 'OFFLINE'}</span>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('map');
  const [selectedSat, setSelectedSat] = useState(null);
  const [backendUp, setBackendUp] = useState(false);
  const [positions, setPositions] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const { satellites, stats, loading, error, lastUpdate, refresh } = useFleet();
  const { alerts, resolve: resolveAlert, refresh: refreshAlerts } = useAlerts();
  const { conjunctions, compute: computeConjunctions, computing } = useConjunctions();

  // Fetch batch positions every 30s
  useEffect(() => {
    const fetchPositions = () => {
      apiFetch('/api/satellites/positions/batch')
        .then(data => setPositions(data))
        .catch(() => {});
    };
    fetchPositions();
    const i = setInterval(fetchPositions, 30000);
    return () => clearInterval(i);
  }, []);

  // Check backend health
  useEffect(() => {
    const check = () => apiFetch('/api/health').then(() => setBackendUp(true)).catch(() => setBackendUp(false));
    check();
    const i = setInterval(check, 15000);
    return () => clearInterval(i);
  }, []);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const unresolvedAlerts = useMemo(() => alerts.filter(a => !a.resolved).length, [alerts]);
  const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'critical' && !a.resolved).length, [alerts]);

  const handleSelectSat = useCallback((sat) => {
    setSelectedSat(prev => prev?.id === sat?.id ? null : sat);
  }, []);

  const fullSelectedSat = useMemo(() =>
    selectedSat ? satellites.find(s => s.id === selectedSat.id) || selectedSat : null
  , [selectedSat, satellites]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#020912' }}>

      {/* ══════ HEADER ══════ */}
      <header style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 16px',
        background: 'rgba(2,9,22,0.98)', borderBottom: '1px solid rgba(0,180,255,0.14)',
        backdropFilter: 'blur(12px)', position: 'relative', zIndex: 100, flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
          <svg width="26" height="26" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
            <circle cx="14" cy="14" r="12" fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.7" />
            <circle cx="14" cy="14" r="6" fill="none" stroke="#00d4ff" strokeWidth="0.8" opacity="0.4" />
            <path d="M14 4 L16 12 L22 14 L16 16 L14 24 L12 16 L6 14 L12 12 Z" fill="#00d4ff" />
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#00d4ff', letterSpacing: '0.12em', lineHeight: 1 }}>ROCKET NOVA</div>
            <div style={{ fontSize: 9, color: 'rgba(0,180,255,0.45)', letterSpacing: '0.08em' }}>AI MISSION CONTROL v2.0</div>
          </div>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const hasAlert = id === 'alerts' && criticalAlerts > 0;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: tab === id ? 'rgba(0,80,200,0.2)' : 'none',
                border: tab === id ? '1px solid rgba(0,180,255,0.35)' : '1px solid transparent',
                borderRadius: 7, color: tab === id ? '#00d4ff' : 'rgba(255,255,255,0.38)',
                padding: '5px 11px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.04em', fontFamily: 'inherit', position: 'relative', transition: 'all 0.15s'
              }}>
                <Icon size={12} />
                {label}
                {id === 'alerts' && unresolvedAlerts > 0 && (
                  <span style={{ background: criticalAlerts > 0 ? '#ff3d3d' : '#ffab00', color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 800, padding: '1px 5px', marginLeft: 2 }}>
                    {unresolvedAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: stats + clock */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>
          <StatBadge label="SATELLITES" value={stats?.total} color="#00d4ff" />
          <StatBadge label="OPERATIONAL" value={stats?.operational} color="#00e676" />
          <StatBadge label="ALERTS" value={unresolvedAlerts} color={criticalAlerts > 0 ? '#ff3d3d' : '#ffab00'} />
          <StatBadge label="AVG HEALTH" value={stats?.avg_health ? `${Math.round(stats.avg_health)}%` : '—'} color="#7c4dff" />

          <div style={{ padding: '0 14px', borderRight: '1px solid rgba(0,180,255,0.08)' }}>
            <div style={{ fontSize: 13, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 600 }}>
              {currentTime.toUTCString().slice(17, 25)} UTC
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
              MJD {(currentTime / 86400000 + 40587).toFixed(4)}
            </div>
          </div>

          <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <LiveIndicator connected={backendUp} />
            <button onClick={refresh} disabled={loading} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin-slow 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ══════ STATS BAR ══════ */}
      <div style={{ height: 36, display: 'flex', background: 'rgba(2,8,20,0.92)', borderBottom: '1px solid rgba(0,180,255,0.08)', flexShrink: 0 }}>
        {[
          { label: 'TOTAL', value: stats?.total, color: '#00d4ff' },
          { label: 'OPERATIONAL', value: stats?.operational, color: '#00e676' },
          { label: 'DEGRADED', value: stats?.degraded, color: '#ffab00' },
          { label: 'WARNING', value: stats?.warning, color: '#ff5252' },
          { label: 'AVG BAT', value: stats?.avg_battery ? `${Math.round(stats.avg_battery)}%` : '—', color: '#00d4ff' },
          { label: 'SGP4', value: stats?.tleCount, color: '#69f0ae' },
          { label: 'CONJUNCTIONS', value: conjunctions.length, color: conjunctions.some(c=>c.risk_level==='critical') ? '#ff3d3d' : '#ffab00' },
          { label: 'LAST UPDATE', value: lastUpdate ? lastUpdate.toLocaleTimeString() : '—', color: 'rgba(255,255,255,0.4)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid rgba(0,180,255,0.06)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value ?? '—'}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em', marginTop: 2 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── MAP TAB ── */}
        {tab === 'map' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <OrbitalMap
                satellites={satellites}
                positions={positions}
                selectedId={selectedSat?.id}
                onSelect={handleSelectSat}
                showTracks={true}
              />

              {/* Map controls overlay */}
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Conjunction button */}
                <button onClick={computeConjunctions} disabled={computing}
                  style={{ background: 'rgba(2,8,22,0.92)', border: '1px solid rgba(0,180,255,0.25)', borderRadius: 8, padding: '7px 12px', color: computing ? '#ffab00' : '#00d4ff', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', backdropFilter: 'blur(8px)' }}>
                  {computing ? '⟳ Computing...' : '⚡ Compute Conjunctions'}
                </button>

                {/* Legend */}
                <div style={{ background: 'rgba(2,8,22,0.88)', border: '1px solid rgba(0,180,255,0.18)', borderRadius: 8, padding: '10px 12px', backdropFilter: 'blur(8px)' }}>
                  <div className="section-label" style={{ marginBottom: 8 }}>LEGEND</div>
                  {[['Operational', '#00e676'], ['Degraded', '#ffab00'], ['Warning', '#ff5252'], ['Ground Station', '#ffd600'], ['Orbit Track (SGP4)', '#00d4ff']].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected satellite info overlay (bottom left) */}
              {fullSelectedSat && (
                <div style={{ position: 'absolute', bottom: 14, left: 12, background: 'rgba(2,8,22,0.92)', border: '1px solid rgba(0,180,255,0.25)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(8px)', maxWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{typeIcon(fullSelectedSat.type)}</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{fullSelectedSat.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{fullSelectedSat.agency}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: statusColor(fullSelectedSat.status) }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                    {[
                      ['Health', `${Math.round(fullSelectedSat.health || 0)}%`],
                      ['Battery', `${Math.round(fullSelectedSat.battery || 0)}%`],
                      ['Alt', `${Math.round(fullSelectedSat.altitude_km || 0)} km`],
                      ['Temp', `${(fullSelectedSat.temperature || 0).toFixed(0)}°C`],
                    ].map(([k, v]) => (
                      <div key={k}><span>{k}: </span><span style={{ color: '#00d4ff', fontFamily: 'monospace' }}>{v}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Satellite list sidebar */}
            <div style={{ width: 270, background: 'rgba(2,8,22,0.97)', borderLeft: '1px solid rgba(0,180,255,0.13)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,180,255,0.1)' }}>
                <input placeholder="Search satellites..." className="input" style={{ fontSize: 12, height: 32 }}
                  onChange={e => {/* handled in Fleet */ }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && satellites.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Loading fleet...</div>
                ) : satellites.map(sat => (
                  <div key={sat.id} onClick={() => handleSelectSat(sat)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: selectedSat?.id === sat.id ? 'rgba(0,80,200,0.15)' : 'transparent', borderLeft: `3px solid ${selectedSat?.id === sat.id ? '#00d4ff' : 'transparent'}`, transition: 'all 0.12s', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(sat.status), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#fff', fontWeight: selectedSat?.id === sat.id ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sat.name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{sat.agency}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#00d4ff', fontFamily: 'monospace' }}>{Math.round(sat.health || 0)}%</div>
                      {sat.tle_line1 && <div style={{ fontSize: 9, color: 'rgba(0,180,255,0.5)' }}>SGP4</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Satellite Detail Panel */}
            <AnimatePresence>
              {selectedSat && (
                <SatelliteDetail satId={selectedSat.id} onClose={() => setSelectedSat(null)} />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── FLEET TAB ── */}
        {tab === 'fleet' && (
          <Fleet
            satellites={satellites}
            selectedSat={fullSelectedSat}
            onSelect={(sat) => { handleSelectSat(sat); setTab('map'); }}
            onRefresh={refresh}
          />
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <Analytics satellites={satellites} conjunctions={conjunctions} />
        )}

        {/* ── AI TAB ── */}
        {tab === 'ai' && (
          <AIChat
            satellites={satellites}
            selectedSat={fullSelectedSat}
            stats={stats}
            alerts={alerts.filter(a => !a.resolved)}
            conjunctions={conjunctions}
          />
        )}

        {/* ── ALERTS TAB ── */}
        {tab === 'alerts' && (
          <Alerts alerts={alerts} onResolve={resolveAlert} onRefresh={refreshAlerts} />
        )}

        {/* ── REPORTS TAB ── */}
        {tab === 'reports' && (
          <Reports satellites={satellites} stats={stats} alerts={alerts} />
        )}

        {/* Backend offline banner */}
        {!backendUp && (
          <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.4)', borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 300 }}>
            <WifiOff size={13} color="#ff5252" />
            <span style={{ fontSize: 11, color: '#ff5252' }}>Backend offline — run <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>cd backend && npm start</code></span>
          </div>
        )}
      </div>
    </div>
  );
}
