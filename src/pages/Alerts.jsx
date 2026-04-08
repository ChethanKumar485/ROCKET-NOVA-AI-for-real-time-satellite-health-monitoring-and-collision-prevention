import { useState } from 'react';
import { AlertTriangle, CheckCircle, Bell, RefreshCw, Shield, Zap, Thermometer, Radio } from 'lucide-react';
import { severityColor, fmtTime } from '../utils/index.js';

const CATEGORY_ICONS = { telemetry: Activity => <Zap size={14} />, system: () => <Shield size={14} />, thermal: () => <Thermometer size={14} />, signal: () => <Radio size={14} />, default: () => <AlertTriangle size={14} /> };

function AlertRow({ alert, onResolve }) {
  const col = severityColor(alert.severity);
  return (
    <div style={{
      background: 'rgba(2,12,35,0.9)', border: `1px solid ${col}28`,
      borderLeft: `3px solid ${col}`, borderRadius: '0 10px 10px 0',
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      opacity: alert.resolved ? 0.5 : 1, transition: 'all 0.2s'
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, flexShrink: 0 }}>
        <AlertTriangle size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{alert.satellite_name || alert.satellite_id}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: `${col}20`, color: col, fontWeight: 700, letterSpacing: '0.04em' }}>
            {alert.severity?.toUpperCase()}
          </span>
          {alert.category && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{alert.category}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{alert.message}</div>
        {alert.details && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{alert.details}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>{fmtTime(alert.created_at)}</div>
        {!alert.resolved && (
          <button onClick={() => onResolve(alert.id)} className="btn btn-success" style={{ padding: '4px 10px', fontSize: 10 }}>
            <CheckCircle size={11} /> Resolve
          </button>
        )}
        {alert.resolved && <span style={{ fontSize: 10, color: '#00e676' }}>✓ Resolved</span>}
      </div>
    </div>
  );
}

export default function Alerts({ alerts, onResolve, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);

  const severities = ['all', 'critical', 'warning', 'info'];
  const filtered = alerts.filter(a => {
    const matchSeverity = filter === 'all' || a.severity === filter;
    const matchResolved = showResolved || !a.resolved;
    return matchSeverity && matchResolved;
  });

  const counts = {
    critical: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
    warning: alerts.filter(a => a.severity === 'warning' && !a.resolved).length,
    total: alerts.filter(a => !a.resolved).length,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,180,255,0.1)', background: 'rgba(2,9,22,0.95)' }}>
        {[
          { label: 'TOTAL UNRESOLVED', value: counts.total, color: '#00d4ff' },
          { label: 'CRITICAL', value: counts.critical, color: '#ff3d3d' },
          { label: 'WARNING', value: counts.warning, color: '#ffab00' },
          { label: 'RESOLVED', value: alerts.filter(a => a.resolved).length, color: '#00e676' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '10px 16px', textAlign: 'center', borderRight: '1px solid rgba(0,180,255,0.08)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,180,255,0.08)', display: 'flex', gap: 8, alignItems: 'center' }}>
        {severities.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '5px 12px', fontSize: 11 }}>
            {s.toUpperCase()}
          </button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
        <button onClick={onRefresh} className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '5px 10px' }}>
          <RefreshCw size={13} />
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{filtered.length} alerts</span>
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <CheckCircle size={40} color="rgba(0,230,118,0.4)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No alerts to display</div>
          </div>
        ) : filtered.map(a => (
          <AlertRow key={a.id} alert={a} onResolve={onResolve} />
        ))}
      </div>
    </div>
  );
}
