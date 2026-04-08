import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(2,9,22,0.95)', border: '1px solid rgba(0,180,255,0.25)', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'monospace', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function TelemetryChart({ data, field, label, color = '#00d4ff', height = 100 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(-72).map(d => ({
      t: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      [field]: parseFloat(d[field]?.toFixed(1) ?? 0)
    }));
  }, [data, field]);

  const min = useMemo(() => Math.min(...chartData.map(d => d[field] ?? 0)), [chartData, field]);
  const max = useMemo(() => Math.max(...chartData.map(d => d[field] ?? 0)), [chartData, field]);

  if (chartData.length === 0) return (
    <div style={{ height, background: 'rgba(0,10,30,0.5)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
      No data
    </div>
  );

  const gradId = `grad_${field}`;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="section-label" style={{ marginBottom: 0 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontFamily: 'monospace', fontWeight: 600 }}>
          {chartData[chartData.length - 1]?.[field] ?? '—'}
          {label.includes('%') ? '%' : label.includes('°') ? '°C' : ''}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} width={32} domain={[Math.max(0, min - 5), Math.min(110, max + 5)]} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey={field} name={label} stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 3, fill: color }} />
          {field === 'battery' && <ReferenceLine y={30} stroke="rgba(255,82,82,0.4)" strokeDasharray="3 3" label={{ value: '30%', fill: 'rgba(255,82,82,0.5)', fontSize: 9 }} />}
          {field === 'health' && <ReferenceLine y={60} stroke="rgba(255,171,0,0.4)" strokeDasharray="3 3" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
