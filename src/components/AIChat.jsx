import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, Satellite, AlertTriangle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_PROMPTS = [
  'What satellites need immediate attention?',
  'Summarize fleet health status',
  'Which satellites have anomalies?',
  'List critical alerts',
  'Explain collision risks',
  'Recommend maintenance priorities',
  'Battery status for all satellites',
  'Which satellites are in eclipse?',
];

export default function AIChat({ satellites, selectedSat, stats, alerts, conjunctions }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `🛰️ **Rocket Nova AI — Mission Control Intelligence**\n\nOnline and monitoring ${satellites?.length || 0} satellites. I have real-time telemetry, anomaly detection (Isolation Forest), orbital data, and collision analysis at my disposal.\n\nHow can I assist mission operations?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const systemPrompt = useMemo(() => {
    if (!satellites?.length) return 'You are Rocket Nova AI, a satellite fleet monitoring assistant.';
    const criticals = satellites.filter(s => s.health < 60 || s.battery < 25);
    const degraded = satellites.filter(s => s.status === 'degraded');
    const warnings = satellites.filter(s => s.status === 'warning');
    const top5 = [...satellites].sort((a, b) => a.health - b.health).slice(0, 5);

    return `You are Rocket Nova AI — an expert Mission Control Intelligence system for an advanced satellite fleet management platform. You have expertise in orbital mechanics (SGP4), satellite telemetry analysis, anomaly detection (Isolation Forest), and space mission operations.

LIVE FLEET STATUS:
- Total satellites: ${satellites.length}
- Operational: ${stats?.operational || 0} | Degraded: ${stats?.degraded || 0} | Warning: ${stats?.warning || 0}
- Average Health: ${stats?.avg_health || 0}% | Average Battery: ${stats?.avg_battery || 0}%
- SGP4-tracked (with TLE): ${stats?.tleCount || 0}
- Unresolved alerts: ${stats?.unresolvedAlerts || 0}

CRITICAL SATELLITES (health < 60% or battery < 25%):
${criticals.map(s => `- ${s.name}: Health ${s.health?.toFixed(0)}%, Battery ${s.battery?.toFixed(0)}%, Status ${s.status}`).join('\n') || 'None'}

DEGRADED/WARNING:
${[...degraded, ...warnings].map(s => `- ${s.name} (${s.status}): ${s.agency}`).join('\n') || 'None'}

LOWEST HEALTH:
${top5.map(s => `- ${s.name}: ${s.health?.toFixed(0)}%`).join('\n')}

RECENT ALERTS (${alerts?.length || 0} unresolved):
${(alerts || []).slice(0, 5).map(a => `- [${a.severity?.toUpperCase()}] ${a.satellite_name}: ${a.message}`).join('\n') || 'None'}

CONJUNCTION RISKS (${conjunctions?.length || 0} active):
${(conjunctions || []).slice(0, 3).map(c => `- ${c.sat_a_name || 'Sat A'} ↔ ${c.sat_b_name || 'Sat B'}: ${c.miss_distance_km?.toFixed(0) || '?'} km miss distance`).join('\n') || 'None computed'}

${selectedSat ? `\nCURRENTLY SELECTED: ${selectedSat.name}
- Agency: ${selectedSat.agency} | Type: ${selectedSat.type}
- Health: ${selectedSat.health?.toFixed(0)}% | Battery: ${selectedSat.battery?.toFixed(0)}% | Fuel: ${selectedSat.fuel?.toFixed(0)}%
- Temperature: ${selectedSat.temperature?.toFixed(1)}°C | Signal: ${selectedSat.signal_strength?.toFixed(0)}%
- Status: ${selectedSat.status} | Altitude: ${selectedSat.altitude_km?.toFixed(0)} km
- Mission: ${selectedSat.mission || 'Not specified'}` : ''}

Provide concise, technical, actionable responses. Use satellite/mission control terminology. Prioritize safety-critical information. When analyzing anomalies, reference the Isolation Forest ML model scores. For orbital questions, reference SGP4 propagation.`;
  }, [satellites, selectedSat, stats, alerts, conjunctions]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    const currentInput = input;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'Anthropic Key',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages
              .filter((_, i) => i > 0)
              .map(m => ({ role: m.role, content: m.text })),
            { role: 'user', content: currentInput }
          ]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.content?.map(c => c.text).join('') || 'Unable to process request.';
      setMessages(prev => [...prev, { role: 'assistant', text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠ ${err.message || 'Connection error. Please check network and try again.'}` }]);
    }
    setLoading(false);
  };

  const formatText = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, color: '#00d4ff', marginTop: 4 }}>{line.slice(2,-2)}</div>;
      if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>• {line.slice(2)}</div>;
      if (line.startsWith('###')) return <div key={i} style={{ fontWeight: 600, color: '#00e676', fontSize: 12, marginTop: 6 }}>{line.slice(3).trim()}</div>;
      if (line === '') return <div key={i} style={{ height: 6 }} />;
      // Render inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <div key={i} style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#fff' }}>{p}</strong> : p)}
        </div>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(2,8,22,0.95)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,180,255,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,100,255,0.2)', border: '1px solid rgba(0,100,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={16} color="#00d4ff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00d4ff' }}>NOVA AI</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Mission Control Intelligence · Claude Sonnet</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {[
            { icon: Satellite, val: stats?.total, label: 'SATS', col: '#00d4ff' },
            { icon: AlertTriangle, val: stats?.unresolvedAlerts, label: 'ALERTS', col: '#ff5252' },
            { icon: Activity, val: stats?.avg_health ? `${Math.round(stats.avg_health)}%` : '—', label: 'HEALTH', col: '#00e676' },
          ].map(({ icon: Icon, val, label, col }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: col, fontFamily: 'monospace' }}>{val ?? '—'}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                background: m.role === 'user' ? 'rgba(0,80,255,0.2)' : 'rgba(0,15,45,0.8)',
                border: `1px solid ${m.role === 'user' ? 'rgba(0,80,255,0.4)' : 'rgba(0,180,255,0.15)'}`,
                borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                padding: '10px 13px',
                fontSize: 12,
                lineHeight: 1.55,
              }}>
              {m.role === 'assistant' ? formatText(m.text) : <span style={{ color: 'rgba(255,255,255,0.9)' }}>{m.text}</span>}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ alignSelf: 'flex-start', background: 'rgba(0,15,45,0.8)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', fontSize: 12 }}>
            <span style={{ color: '#00d4ff' }}>●</span>
            <span style={{ color: 'rgba(0,180,255,0.6)', marginLeft: 6 }}>Analyzing mission data</span>
            <span style={{ color: '#00d4ff' }}>_</span>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick prompts */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: 6, overflowX: 'auto', borderTop: '1px solid rgba(0,180,255,0.08)', scrollbarWidth: 'none' }}>
        {QUICK_PROMPTS.map(q => (
          <button key={q} onClick={() => setInput(q)}
            style={{ background: 'rgba(0,30,70,0.7)', border: '1px solid rgba(0,180,255,0.18)', borderRadius: 20, padding: '4px 10px', color: 'rgba(0,200,255,0.75)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(0,180,255,0.12)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about satellites, anomalies, orbits, risks..."
          className="input"
        />
        <button onClick={send} disabled={loading || !input.trim()} className="btn btn-primary" style={{ flexShrink: 0, padding: '8px 14px' }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}