import { useState, useRef } from 'react';
import { FileText, Download, RefreshCw, Printer } from 'lucide-react';
import { statusColor, healthColor, typeIcon, fmt, anomalyScore } from '../utils/index.js';
import { apiFetch } from '../hooks/useAPI.js';

export default function Reports({ satellites, stats, alerts }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/reports/summary');
      setReport(data);
    } catch {
      // Fallback local report
      const criticals = satellites.filter(s => s.health < 60 || s.battery < 25);
      const topAnomalies = [...satellites].sort((a,b) => anomalyScore(b) - anomalyScore(a)).slice(0, 5);
      setReport({
        generated: new Date().toISOString(),
        fleet: { total: satellites.length, operational: satellites.filter(s=>s.status==='operational').length, degraded: satellites.filter(s=>s.status==='degraded').length },
        avgHealth: stats?.avg_health || 0,
        topAnomalies: topAnomalies.map(s => ({ name: s.name, score: anomalyScore(s) })),
        critical: criticals.map(s => s.name),
        recommendations: [
          criticals.length > 0 ? `${criticals.length} satellites require immediate attention` : 'Fleet health is nominal',
          `${alerts?.filter(a=>!a.resolved).length || 0} unresolved alerts require review`,
          'Schedule orbital maintenance for low-fuel satellites'
        ]
      });
    }
    setLoading(false);
  };

  const exportPDF = async () => {
    if (!report) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, { backgroundColor: '#020912', scale: 1.5 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgW = 210, imgH = canvas.height * imgW / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
        pdf.save(`rocket-nova-report-${new Date().toISOString().slice(0,10)}.pdf`);
      }
    } catch (e) { console.error('PDF export failed:', e); }
  };

  const now = new Date();

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>MISSION REPORTS</h2>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>AI-generated fleet status & analysis</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generateReport} disabled={loading} className="btn btn-primary">
            <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <button onClick={exportPDF} className="btn btn-ghost">
              <Download size={13} /> Export PDF
            </button>
          )}
        </div>
      </div>

      {!report ? (
        <div style={{ textAlign: 'center', padding: 80, border: '1px dashed rgba(0,180,255,0.2)', borderRadius: 16 }}>
          <FileText size={40} color="rgba(0,180,255,0.3)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>Click Generate Report to create a fleet status report</div>
        </div>
      ) : (
        <div ref={reportRef} style={{ background: 'rgba(2,9,22,0.98)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 16, padding: 28, fontFamily: 'monospace' }}>
          {/* Report header */}
          <div style={{ borderBottom: '1px solid rgba(0,180,255,0.2)', paddingBottom: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <svg width="24" height="24" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="12" fill="none" stroke="#00d4ff" strokeWidth="1" />
                  <path d="M14 4 L16 12 L22 14 L16 16 L14 24 L12 16 L6 14 L12 12 Z" fill="#00d4ff" />
                </svg>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#00d4ff', letterSpacing: '0.1em' }}>ROCKET NOVA</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Fleet Status Report · AI Mission Control · v2.0</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{now.toUTCString().slice(17,25)} UTC</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>MJD {(now/86400000 + 40587).toFixed(4)}</div>
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              ['TOTAL SATELLITES', report.fleet?.total, '#00d4ff'],
              ['OPERATIONAL', report.fleet?.operational, '#00e676'],
              ['DEGRADED', report.fleet?.degraded, '#ffab00'],
              ['AVG HEALTH', `${Math.round(report.avgHealth)}%`, healthColor(report.avgHealth)],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: 'rgba(0,15,45,0.7)', border: `1px solid ${c}30`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, letterSpacing: '0.06em' }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Critical satellites */}
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>CRITICAL SATELLITES</div>
              {report.critical?.length === 0 ? (
                <div style={{ color: '#00e676', fontSize: 12, padding: '8px 0' }}>✓ No critical satellites</div>
              ) : report.critical?.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: '#ff5252' }}>
                  <span style={{ color: '#ff3d3d' }}>⚠</span> {name}
                </div>
              ))}
            </div>

            {/* Top anomalies */}
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>TOP ANOMALY SCORES (ML)</div>
              {report.topAnomalies?.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 16 }}>#{i+1}</span>
                  <span style={{ fontSize: 12, color: '#fff', flex: 1 }}>{a.name}</span>
                  <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${a.score}%`, background: a.score > 60 ? '#ff3d3d' : a.score > 35 ? '#ffab00' : '#00e676', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: a.score > 60 ? '#ff3d3d' : a.score > 35 ? '#ffab00' : '#00e676', width: 28, textAlign: 'right' }}>{a.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Satellite table */}
          <div style={{ marginBottom: 24 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>FLEET STATUS SUMMARY</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,180,255,0.15)' }}>
                  {['Satellite','Agency','Type','Status','Health','Battery','Fuel','Signal','Altitude'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satellites.slice(0, 20).map((sat, i) => (
                  <tr key={sat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i%2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                    <td style={{ padding: '5px 10px', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{typeIcon(sat.type)} {sat.name}</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.5)' }}>{sat.agency}</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.45)' }}>{sat.type}</td>
                    <td style={{ padding: '5px 10px', color: statusColor(sat.status), fontWeight: 700 }}>{sat.status?.toUpperCase()}</td>
                    <td style={{ padding: '5px 10px', color: healthColor(sat.health), fontFamily: 'monospace' }}>{fmt(sat.health,0)}%</td>
                    <td style={{ padding: '5px 10px', color: '#00d4ff', fontFamily: 'monospace' }}>{fmt(sat.battery,0)}%</td>
                    <td style={{ padding: '5px 10px', color: '#7c4dff', fontFamily: 'monospace' }}>{fmt(sat.fuel,0)}%</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{fmt(sat.signal_strength,0)}%</td>
                    <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{fmt(sat.altitude_km,0)} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendations */}
          <div style={{ background: 'rgba(0,80,255,0.08)', border: '1px solid rgba(0,80,255,0.25)', borderRadius: 10, padding: '14px 18px' }}>
            <div className="section-label" style={{ color: '#00d4ff', marginBottom: 10 }}>AI RECOMMENDATIONS</div>
            {report.recommendations?.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                <span style={{ color: '#00d4ff', flexShrink: 0 }}>{i+1}.</span>{r}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,180,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            <span>Generated: {new Date(report.generated).toLocaleString()}</span>
            <span>Rocket Nova v2.0 · Isolation Forest ML · SGP4 Orbital Propagation</span>
          </div>
        </div>
      )}
    </div>
  );
}
