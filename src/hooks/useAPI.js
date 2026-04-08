import { useState, useEffect, useCallback, useRef } from 'react';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
const WS_URL = BASE_URL.replace('http', 'ws');

// ─── Generic fetch helper ──────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

// ─── useFleet ─────────────────────────────────────────────
export function useFleet() {
  const [satellites, setSatellites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);

  const fetchFleet = useCallback(async () => {
    try {
      const [satData, statsData] = await Promise.all([
        apiFetch('/api/satellites?limit=200'),
        apiFetch('/api/fleet/stats')
      ]);
      setSatellites(satData.satellites || []);
      setStats(statsData);
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();

    // WebSocket for live updates
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === 'telemetry_update' || msg.type === 'positions_updated') {
            fetchFleet();
          }
          if (msg.type === 'telemetry') {
            setSatellites(prev => prev.map(s =>
              s.id === msg.data.satelliteId
                ? { ...s, health: msg.data.health, battery: msg.data.battery, temperature: msg.data.temperature }
                : s
            ));
          }
        };
        ws.onclose = () => setTimeout(connect, 5000);
        ws.onerror = () => {};
      } catch {}
    };

    connect();
    const interval = setInterval(fetchFleet, 60000);
    return () => {
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, [fetchFleet]);

  return { satellites, stats, loading, error, lastUpdate, refresh: fetchFleet };
}

// ─── useSatellite ─────────────────────────────────────────
export function useSatellite(id) {
  const [data, setData] = useState(null);
  const [position, setPosition] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [track, setTrack] = useState([]);
  const [anomaly, setAnomaly] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const load = async () => {
      try {
        const [satData, telData, anomData] = await Promise.all([
          apiFetch(`/api/satellites/${id}`),
          apiFetch(`/api/satellites/${id}/telemetry?hours=48&limit=200`),
          apiFetch(`/api/satellites/${id}/anomalies`),
        ]);
        setData(satData);
        setTelemetry(telData.data || []);
        setAnomaly(anomData);

        // Position
        try {
          const pos = await apiFetch(`/api/satellites/${id}/position`);
          setPosition(pos);
        } catch {}

        // Ground track
        try {
          const t = await apiFetch(`/api/satellites/${id}/track?minutes=90`);
          setTrack(t.track || []);
        } catch {}
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
    const interval = setInterval(() => {
      apiFetch(`/api/satellites/${id}/position`).then(setPosition).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  return { data, position, telemetry, track, anomaly, loading };
}

// ─── useAlerts ────────────────────────────────────────────
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);

  const fetchAlerts = useCallback(() =>
    apiFetch('/api/alerts?limit=50').then(d => setAlerts(d.alerts || [])).catch(() => {}), []);

  useEffect(() => {
    fetchAlerts();
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'alert') { fetchAlerts(); }
      };
      ws.onclose = () => {};
    } catch {}
    const interval = setInterval(fetchAlerts, 30000);
    return () => { clearInterval(interval); wsRef.current?.close(); };
  }, [fetchAlerts]);

  const resolve = async (id) => {
    await apiFetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
    fetchAlerts();
  };

  return { alerts, resolve, refresh: fetchAlerts };
}

// ─── useConjunctions ─────────────────────────────────────
export function useConjunctions() {
  const [conjunctions, setConjunctions] = useState([]);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    apiFetch('/api/conjunctions').then(d => setConjunctions(d.conjunctions || [])).catch(() => {});
  }, []);

  const compute = async () => {
    setComputing(true);
    try {
      const d = await apiFetch('/api/conjunctions/compute');
      setConjunctions(d.conjunctions || []);
    } finally { setComputing(false); }
  };

  return { conjunctions, compute, computing };
}

// ─── usePasses ────────────────────────────────────────────
export function usePasses(satId, stationLat, stationLon) {
  const [passes, setPasses] = useState([]);
  useEffect(() => {
    if (!satId) return;
    apiFetch(`/api/satellites/${satId}/passes?lat=${stationLat}&lon=${stationLon}&hours=24`)
      .then(d => setPasses(d.passes || [])).catch(() => {});
  }, [satId, stationLat, stationLon]);
  return passes;
}

// ─── useMissions ─────────────────────────────────────────
export function useMissions() {
  const [missions, setMissions] = useState([]);
  useEffect(() => {
    apiFetch('/api/missions').then(d => setMissions(d.missions || [])).catch(() => {});
  }, []);
  return missions;
}

// ─── useCommands ─────────────────────────────────────────
export function useCommands() {
  const [log, setLog] = useState([]);
  const [sending, setSending] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/command-log').then(d => setLog(d.commands || [])).catch(() => {});
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'command' || msg.type === 'command_ack') {
          apiFetch('/api/command-log').then(d => setLog(d.commands || [])).catch(() => {});
        }
      };
    } catch {}
    return () => wsRef.current?.close();
  }, []);

  const send = async (satelliteId, command, parameters = {}) => {
    setSending(true);
    try {
      await apiFetch('/api/command', { method: 'POST', body: JSON.stringify({ satelliteId, command, parameters }) });
      setTimeout(() => apiFetch('/api/command-log').then(d => setLog(d.commands || [])).catch(() => {}), 2500);
    } finally { setSending(false); }
  };

  return { log, send, sending };
}

export { apiFetch, BASE_URL, WS_URL };
