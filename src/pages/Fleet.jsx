import { useState, useMemo } from 'react';
import { Search, Filter, SortAsc, RefreshCw, AlertTriangle } from 'lucide-react';
import { statusColor, healthColor, typeIcon, typeLabel, fmt, fmtAlt, anomalyScore } from '../utils/index.js';

const TYPES = ['all','space_station','science','comm','navigation','earth_obs','weather','imaging'];
const STATUSES = ['all','operational','degraded','warning'];
const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'health', label: 'Health' },
  { value: 'battery', label: 'Battery' },
  { value: 'altitude', label: 'Altitude' },
  { value: 'anomaly', label: 'Anomaly' },
];

function SatCard({ sat, onSelect, isSelected }) {
  const score = anomalyScore(sat);
  const scoreColor = score > 60 ? '#ff3d3d' : score > 35 ? '#ffab00' : '#00e676';
  return (
    <div onClick={() => onSelect(sat)} style={{
      background: isSelected ? 'rgba(0,80,200,0.12)' : 'rgba(2,12,35,0.92)',
      border: `1px solid ${isSelected ? 'rgba(0,180,255,0.45)' : 'rgba(0,150,255,0.1)'}`,
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Anomaly glow */}
      {score > 60 && <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: '#ff3d3d', borderRadius: '0 12px 12px 0' }} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{typeIcon(sat.type)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sat.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{sat.agency}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(sat.status) }} />
            <span style={{ fontSize: 10, color: statusColor(sat.status), fontWeight: 700 }}>{sat.status?.toUpperCase()}</span>
          </div>
          <span style={{ fontSize: 10, color: scoreColor, fontFamily: 'monospace' }}>AI:{score}</span>
        </div>
      </div>

      {/* Metric bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[['H', sat.health, healthColor(sat.health)], ['B', sat.battery, '#00d4ff'], ['F', sat.fuel, '#7c4dff']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'rgba(0,20,55,0.6)', borderRadius: 6, padding: '5px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{l}</span>
              <span style={{ fontSize: 10, color: c, fontWeight: 700, fontFamily: 'monospace' }}>{fmt(v, 0)}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, v || 0))}%`, background: c, borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
          {fmtAlt(sat.altitude_km)}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
          {fmt(sat.temperature, 0)}°C · {fmt(sat.signal_strength, 0)}%
        </div>
      </div>

      {/* TLE badge */}
      {sat.tle_line1 && (
        <div style={{ position: 'absolute', top: 10, right: score > 60 ? 14 : 10, fontSize: 9, background: 'rgba(0,180,255,0.15)', color: '#00d4ff', padding: '1px 6px', borderRadius: 20, border: '1px solid rgba(0,180,255,0.25)' }}>
          SGP4
        </div>
      )}
    </div>
  );
}

export default function Fleet({ satellites, selectedSat, onSelect, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('health');
  const [viewMode, setViewMode] = useState('grid'); // grid | table

  const filtered = useMemo(() => {
    let list = satellites.filter(s => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.agency?.toLowerCase().includes(search.toLowerCase()) || s.id?.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || s.type === filterType;
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
    const sortFns = {
      name: (a, b) => a.name.localeCompare(b.name),
      health: (a, b) => (a.health || 0) - (b.health || 0),
      battery: (a, b) => (a.battery || 0) - (b.battery || 0),
      altitude: (a, b) => (b.altitude_km || 0) - (a.altitude_km || 0),
      anomaly: (a, b) => anomalyScore(b) - anomalyScore(a),
    };
    return [...list].sort(sortFns[sortBy] || sortFns.name);
  }, [satellites, search, filterType, filterStatus, sortBy]);

  const criticalCount = useMemo(() => satellites.filter(s => s.health < 50 || s.battery < 20).length, [satellites]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,180,255,0.1)', background: 'rgba(2,9,22,0.95)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, agency, ID..."
            className="input" style={{ paddingLeft: 30, height: 34, fontSize: 12 }} />
        </div>

        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: 'rgba(0,15,40,0.8)', border: '1px solid rgba(0,150,255,0.2)', borderRadius: 8, padding: '0 10px', color: '#fff', fontSize: 12, height: 34, cursor: 'pointer' }}>
          {TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'rgba(0,15,40,0.8)', border: '1px solid rgba(0,150,255,0.2)', borderRadius: 8, padding: '0 10px', color: '#fff', fontSize: 12, height: 34, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: 'rgba(0,15,40,0.8)', border: '1px solid rgba(0,150,255,0.2)', borderRadius: 8, padding: '0 10px', color: '#fff', fontSize: 12, height: 34, cursor: 'pointer' }}>
          {SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {['grid','table'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`btn ${viewMode === m ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 10px', fontSize: 11 }}>{m.toUpperCase()}</button>
          ))}
        </div>

        <button onClick={onRefresh} className="btn btn-ghost" style={{ padding: '5px 10px' }}>
          <RefreshCw size={13} />
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {criticalCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ff5252' }}>
              <AlertTriangle size={12} />{criticalCount} critical
            </div>
          )}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{filtered.length}/{satellites.length} satellites</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {filtered.map(sat => (
              <SatCard key={sat.id} sat={sat} onSelect={onSelect} isSelected={selectedSat?.id === sat.id} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,180,255,0.15)' }}>
                  {['Name','Agency','Type','Status','Health','Battery','Fuel','Temp','Signal','Alt','SGP4','Anomaly'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((sat, i) => {
                  const score = anomalyScore(sat);
                  return (
                    <tr key={sat.id} onClick={() => onSelect(sat)} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: selectedSat?.id === sat.id ? 'rgba(0,80,200,0.12)' : i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent',
                      cursor: 'pointer'
                    }}>
                      <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{typeIcon(sat.type)} {sat.name}</td>
                      <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)' }}>{sat.agency}</td>
                      <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)' }}>{typeLabel(sat.type)}</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ color: statusColor(sat.status), fontWeight: 700, fontSize: 10 }}>{sat.status?.toUpperCase()}</span></td>
                      <td style={{ padding: '8px 12px', color: healthColor(sat.health), fontFamily: 'monospace', fontWeight: 600 }}>{fmt(sat.health, 0)}%</td>
                      <td style={{ padding: '8px 12px', color: '#00d4ff', fontFamily: 'monospace' }}>{fmt(sat.battery, 0)}%</td>
                      <td style={{ padding: '8px 12px', color: '#7c4dff', fontFamily: 'monospace' }}>{fmt(sat.fuel, 0)}%</td>
                      <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{fmt(sat.temperature, 1)}°C</td>
                      <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{fmt(sat.signal_strength, 0)}%</td>
                      <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmt(sat.altitude_km, 0)} km</td>
                      <td style={{ padding: '8px 12px' }}>{sat.tle_line1 ? <span style={{ color: '#00d4ff', fontSize: 10 }}>✓ SGP4</span> : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>—</span>}</td>
                      <td style={{ padding: '8px 12px', color: score > 60 ? '#ff3d3d' : score > 35 ? '#ffab00' : '#00e676', fontFamily: 'monospace', fontWeight: 700 }}>{score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            No satellites match filters
          </div>
        )}
      </div>
    </div>
  );
}
