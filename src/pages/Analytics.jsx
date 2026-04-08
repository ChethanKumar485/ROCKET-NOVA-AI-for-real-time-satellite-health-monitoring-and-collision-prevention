import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { anomalyScore } from '../utils/index.js';

const COLORS = ['#00d4ff','#00e676','#7c4dff','#ffab00','#ff5252','#ff9944','#4fc3f7','#69f0ae'];
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(2,9,22,0.96)', border: '1px solid rgba(0,180,255,0.25)', borderRadius: 6, padding: '7px 12px', fontSize: 11 }}>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || '#00d4ff', fontFamily: 'monospace' }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>)}
    </div>
  );
};

function ChartCard({ title, children, span = 1 }) {
  return (
    <div className="card" style={{ padding: '14px 16px', gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <div className="section-label">{title}</div>
      {children}
    </div>
  );
}

export default function Analytics({ satellites, conjunctions }) {
  // Health distribution
  const healthBins = useMemo(() => {
    const bins = Array(10).fill(0);
    satellites.forEach(s => bins[Math.min(9, Math.floor((s.health || 0) / 10))]++);
    return bins.map((count, i) => ({ range: `${i*10}-${i*10+9}`, count, fill: i < 4 ? '#ff5252' : i < 7 ? '#ffab00' : '#00e676' }));
  }, [satellites]);

  // Type breakdown
  const typeCounts = useMemo(() => {
    const counts = {};
    satellites.forEach(s => { counts[s.type || 'unknown'] = (counts[s.type || 'unknown'] || 0) + 1; });
    return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] })).sort((a,b) => b.value - a.value);
  }, [satellites]);

  // Agency breakdown
  const agencyCounts = useMemo(() => {
    const counts = {};
    satellites.forEach(s => { counts[s.agency || 'Unknown'] = (counts[s.agency || 'Unknown'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);
  }, [satellites]);

  // Scatter: altitude vs health
  const scatter = useMemo(() => satellites.map(s => ({
    alt: Math.round(s.altitude_km || 0),
    health: Math.round(s.health || 0),
    name: s.name,
    fill: s.status === 'operational' ? '#00e676' : s.status === 'degraded' ? '#ffab00' : '#ff5252'
  })), [satellites]);

  // Anomaly scores sorted
  const anomalies = useMemo(() =>
    satellites.map(s => ({ name: s.name.slice(0,14), score: anomalyScore(s) }))
      .sort((a,b) => b.score - a.score).slice(0, 15)
  , [satellites]);

  // Battery distribution
  const batteryBins = useMemo(() => {
    const bins = [0,0,0,0,0];
    satellites.forEach(s => {
      const b = s.battery || 0;
      if (b < 20) bins[0]++;
      else if (b < 40) bins[1]++;
      else if (b < 60) bins[2]++;
      else if (b < 80) bins[3]++;
      else bins[4]++;
    });
    return [
      { range: '<20%', count: bins[0], fill: '#ff3d3d' },
      { range: '20-40%', count: bins[1], fill: '#ff6d00' },
      { range: '40-60%', count: bins[2], fill: '#ffd600' },
      { range: '60-80%', count: bins[3], fill: '#69f0ae' },
      { range: '>80%', count: bins[4], fill: '#00e676' },
    ];
  }, [satellites]);

  // Summary stats
  const summary = useMemo(() => ({
    avgHealth: (satellites.reduce((a,s) => a + (s.health||0), 0) / satellites.length).toFixed(1),
    avgBattery: (satellites.reduce((a,s) => a + (s.battery||0), 0) / satellites.length).toFixed(1),
    avgFuel: (satellites.reduce((a,s) => a + (s.fuel||0), 0) / satellites.length).toFixed(1),
    withTLE: satellites.filter(s => s.tle_line1).length,
    critical: satellites.filter(s => s.health < 50 || s.battery < 20).length,
  }), [satellites]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          ['Avg Health', `${summary.avgHealth}%`, '#00e676'],
          ['Avg Battery', `${summary.avgBattery}%`, '#00d4ff'],
          ['Avg Fuel', `${summary.avgFuel}%`, '#7c4dff'],
          ['SGP4-Active', summary.withTLE, '#ffab00'],
          ['Critical', summary.critical, '#ff5252'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: 'rgba(0,12,35,0.9)', border: '1px solid rgba(0,180,255,0.12)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        <ChartCard title="HEALTH DISTRIBUTION">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={healthBins} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Satellites" radius={[3,3,0,0]}>
                {healthBins.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="BATTERY LEVELS">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={batteryBins} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Satellites" radius={[3,3,0,0]}>
                {batteryBins.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <ChartCard title="FLEET COMPOSITION">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={typeCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                {typeCounts.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
            {typeCounts.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: t.fill, display: 'inline-block' }} />
                {t.name} ({t.value})
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="BY AGENCY">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agencyCounts} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Satellites" fill="#00d4ff" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ALTITUDE vs HEALTH">
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="alt" name="Altitude" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'km', fill: 'rgba(255,255,255,0.2)', fontSize: 9, position: 'insideBottomRight' }} />
              <YAxis dataKey="health" name="Health" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(0,180,255,0.3)' }} content={({ payload }) =>
                payload?.length ? <div style={{ background: 'rgba(2,9,22,0.96)', border: '1px solid rgba(0,180,255,0.25)', borderRadius: 6, padding: '6px 10px', fontSize: 10 }}>
                  <div style={{ color: '#00d4ff' }}>{payload[0]?.payload?.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)' }}>Alt: {payload[0]?.payload?.alt}km · Health: {payload[0]?.payload?.health}%</div>
                </div> : null
              } />
              <Scatter data={scatter} shape={({ cx, cy, fill }) => (
                <circle cx={cx} cy={cy} r={4} fill={`${fill}bb`} stroke={fill} strokeWidth={0.8} />
              )} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Anomaly Scores */}
      <ChartCard title="ISOLATION FOREST ANOMALY SCORES (TOP 15)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={anomalies} margin={{ top: 4, right: 8, bottom: 20, left: -20 }}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
            <Bar dataKey="score" name="Anomaly Score" radius={[3,3,0,0]}>
              {anomalies.map((entry, i) => (
                <Cell key={i} fill={entry.score > 60 ? '#ff3d3d' : entry.score > 35 ? '#ffab00' : '#00e676'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          {[['> 60: Critical', '#ff3d3d'], ['35-60: Elevated', '#ffab00'], ['< 35: Normal', '#00e676']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Conjunction Risk Table */}
      {conjunctions?.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginTop: 12 }}>
          <div className="section-label">CONJUNCTION RISK ANALYSIS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {conjunctions.slice(0, 8).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(0,15,45,0.7)', borderRadius: 8, border: `1px solid ${c.risk_level === 'critical' ? 'rgba(255,60,60,0.3)' : c.risk_level === 'high' ? 'rgba(255,109,0,0.25)' : 'rgba(255,214,0,0.2)'}` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.risk_level === 'critical' ? '#ff3d3d' : c.risk_level === 'high' ? '#ff6d00' : '#ffd600', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, flex: 1 }}>{c.sat_a_name || c.satA || 'Sat A'} ↔ {c.sat_b_name || c.satB || 'Sat B'}</span>
                <span style={{ fontSize: 11, color: '#00d4ff', fontFamily: 'monospace' }}>{c.miss_distance_km?.toFixed(0) || c.minDistance || '?'} km</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: c.risk_level === 'critical' ? 'rgba(255,60,60,0.15)' : 'rgba(255,109,0,0.15)', color: c.risk_level === 'critical' ? '#ff5252' : '#ff9944', fontWeight: 700 }}>{(c.risk_level || c.riskLevel || 'low').toUpperCase()}</span>
                {c.tca && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>TCA: {new Date(c.tca).toLocaleTimeString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
