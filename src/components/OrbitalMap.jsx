import { useRef, useEffect, useCallback } from 'react';
import { statusColor } from '../utils/index.js';

// Simplified SGP4 propagation for client-side use
function propagateClient(tle2, minutesOffset = 0) {
  if (!tle2) return null;
  try {
    const parts = tle2.trim().split(/\s+/);
    const inc = parseFloat(parts[2]) * Math.PI / 180;
    const raan = parseFloat(parts[3]) * Math.PI / 180;
    const ecc = parseFloat('0.' + parts[4]);
    const argP = parseFloat(parts[5]) * Math.PI / 180;
    const M0 = parseFloat(parts[6]) * Math.PI / 180;
    const n = parseFloat(parts[7]) * 2 * Math.PI / 1440;
    const M = M0 + n * minutesOffset;
    let E = M;
    for (let i = 0; i < 6; i++) E = M + ecc * Math.sin(E);
    const nu = 2 * Math.atan2(Math.sqrt(1+ecc)*Math.sin(E/2), Math.sqrt(1-ecc)*Math.cos(E/2));
    const n_rev = parseFloat(parts[7]);
    const a_km = Math.pow(398600.4418 / (n_rev * 2*Math.PI/86400)**2, 1/3);
    const r = a_km * (1 - ecc * Math.cos(E));
    const u = argP + nu;
    const xECI = r*(Math.cos(raan)*Math.cos(u) - Math.sin(raan)*Math.sin(u)*Math.cos(inc));
    const yECI = r*(Math.sin(raan)*Math.cos(u) + Math.cos(raan)*Math.sin(u)*Math.cos(inc));
    const zECI = r*Math.sin(inc)*Math.sin(u);
    const theta = ((Date.now()/1000 + minutesOffset*60) % 86400) * 2*Math.PI/86400;
    const lat = Math.asin(zECI/r) * 180/Math.PI;
    const lon = ((Math.atan2(yECI, xECI) - theta) * 180/Math.PI + 540) % 360 - 180;
    return { lat, lon, alt: r - 6371.0 };
  } catch { return null; }
}

// Simplified world coastline polygons (lat/lon pairs)
const COASTLINES = [
  // North America
  [[71,-141],[70,-130],[60,-130],[55,-125],[50,-125],[48,-120],[46,-120],[48,-90],[48,-84],[46,-83],[42,-82],[42,-70],[44,-66],[47,-53],[52,-55],[60,-64],[65,-68],[70,-68],[73,-80],[70,-95],[70,-110],[70,-130],[71,-141]],
  [[25,-80],[24,-80],[20,-87],[15,-85],[10,-83],[8,-77],[10,-75],[12,-71],[17,-67],[18,-66],[20,-70],[25,-80]],
  [[20,-105],[22,-97],[24,-97],[26,-97],[27,-97],[27,-100],[25,-105],[20,-105]],
  // South America
  [[12,-72],[8,-62],[5,-52],[0,-50],[-5,-35],[-10,-37],[-15,-38],[-20,-40],[-23,-43],[-25,-48],[-30,-50],[-33,-53],[-38,-57],[-42,-63],[-50,-68],[-54,-65],[-55,-66],[-54,-70],[-50,-73],[-45,-73],[-40,-72],[-35,-70],[-30,-70],[-25,-70],[-20,-68],[-15,-75],[-10,-78],[-5,-80],[0,-78],[5,-77],[10,-75],[12,-72]],
  // Europe
  [[71,28],[70,20],[65,15],[60,5],[55,8],[52,4],[51,2],[48,2],[43,5],[43,3],[40,0],[38,0],[36,5],[37,10],[38,14],[40,18],[42,18],[44,14],[45,13],[46,13],[48,17],[50,14],[52,15],[54,18],[56,20],[58,22],[60,25],[65,25],[68,28],[71,28]],
  [[60,-2],[57,0],[52,0],[50,-5],[52,-5],[54,-3],[56,-3],[58,-4],[60,-2]],
  // Africa
  [[37,10],[35,11],[30,32],[25,35],[15,42],[10,44],[5,42],[0,42],[-5,40],[-10,40],[-15,37],[-20,35],[-25,33],[-30,30],[-34,26],[-35,18],[-30,17],[-25,15],[-20,13],[-15,12],[-10,15],[-5,10],[0,10],[5,2],[0,-3],[5,-8],[10,-15],[15,-17],[18,-16],[20,-17],[10,-18],[5,-5],[0,5],[5,10],[10,15],[15,12],[20,15],[25,25],[30,32],[35,36],[37,10]],
  // Asia
  [[70,30],[65,35],[60,40],[55,50],[55,60],[55,70],[58,70],[60,70],[65,65],[70,65],[73,70],[75,80],[75,90],[70,100],[65,105],[60,110],[55,110],[50,105],[45,110],[40,115],[35,120],[30,120],[25,120],[20,110],[15,108],[10,105],[5,100],[5,104],[8,100],[10,100],[15,102],[20,96],[22,92],[22,88],[18,82],[15,75],[12,77],[8,77],[8,78],[10,79],[13,80],[13,79],[10,80],[8,80],[8,77],[10,75],[15,70],[18,65],[20,58],[20,55],[22,55],[25,57],[28,58],[30,62],[35,60],[38,55],[40,50],[45,48],[50,50],[55,55],[60,56],[65,55],[70,50],[72,45],[70,40],[70,30]],
  [[0,104],[0,110],[5,115],[8,110],[5,104],[0,104]],
  [[55,160],[60,150],[65,145],[68,140],[70,135],[70,140],[65,155],[60,162],[55,160]],
  // Australia
  [[-15,128],[-20,115],[-25,113],[-30,114],[-35,116],[-38,140],[-38,145],[-35,150],[-30,153],[-25,152],[-20,148],[-15,144],[-12,135],[-12,130],[-15,128]],
  [[-40,144],[-43,146],[-43,148],[-40,148],[-40,144]],
  // Greenland
  [[60,-45],[65,-52],[70,-52],[75,-55],[80,-50],[83,-35],[80,-20],[75,-18],[70,-22],[65,-37],[60,-45]],
  // Japan
  [[31,130],[33,131],[34,132],[35,136],[37,137],[38,141],[40,141],[43,141],[44,142],[42,140],[38,141],[37,140],[35,137],[34,135],[32,131],[31,130]],
];

export default function OrbitalMap({ satellites, positions, selectedId, onSelect, showTracks = true }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw() {
      const W = canvas.width = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      timeRef.current += 0.002;
      const t = timeRef.current;

      const toXY = (lat, lon) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];

      // Background
      ctx.fillStyle = '#020912';
      ctx.fillRect(0, 0, W, H);

      // Star field
      if (!draw._stars) {
        draw._stars = Array.from({length: 200}, (_, i) => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, b: Math.random() }));
      }
      draw._stars.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + s.b * 0.4 * (0.7 + 0.3 * Math.sin(t*2 + s.b*10))})`;
        ctx.fill();
      });

      // Ocean gradient
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
      oceanGrad.addColorStop(0, 'rgba(0,15,40,0.7)');
      oceanGrad.addColorStop(1, 'rgba(0,8,25,0.7)');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(0,180,255,0.05)';
      ctx.lineWidth = 0.5;
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = (lon+180)/360*W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        if (lon !== -180) {
          ctx.fillStyle = 'rgba(0,180,255,0.2)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
          ctx.fillText(lon+'°', x, H - 4);
        }
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = (90-lat)/180*H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = 'rgba(0,180,255,0.2)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(lat+'°', 4, y - 2);
      }

      // Coastlines
      ctx.fillStyle = 'rgba(15,70,120,0.32)';
      ctx.strokeStyle = 'rgba(0,150,200,0.22)';
      ctx.lineWidth = 0.7;
      COASTLINES.forEach(poly => {
        ctx.beginPath();
        poly.forEach(([lat, lon], i) => {
          const [x, y] = toXY(lat, lon);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });

      // Terminator (day/night line)
      const dayAngle = (t * 0.8 % (2*Math.PI));
      const terminatorX = ((dayAngle / (2*Math.PI)) * W + W/2) % W;
      const nightGrad = ctx.createLinearGradient(terminatorX - 80, 0, terminatorX + 80, 0);
      nightGrad.addColorStop(0, 'rgba(0,0,0,0)');
      nightGrad.addColorStop(0.5, 'rgba(0,0,15,0.28)');
      nightGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nightGrad; ctx.fillRect(0, 0, W, H);

      // Orbit tracks
      if (showTracks) {
        satellites.forEach(sat => {
          if (!sat.tle_line2) return;
          const isSelected = sat.id === selectedId;
          ctx.strokeStyle = isSelected ? 'rgba(0,212,255,0.5)' : 'rgba(0,150,200,0.1)';
          ctx.lineWidth = isSelected ? 1.5 : 0.7;
          ctx.setLineDash([4, 6]);
          const steps = isSelected ? 120 : 40;
          let prevX = null;
          ctx.beginPath();
          let moved = false;
          for (let m = -20; m <= 90; m += 90/steps) {
            const p = propagateClient(sat.tle_line2, m + t * 6);
            if (!p) continue;
            const [x, y] = toXY(p.lat, p.lon);
            if (prevX !== null && Math.abs(x - prevX) > W/2) { ctx.stroke(); ctx.beginPath(); moved = false; }
            moved ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            moved = true; prevX = x;
          }
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // Ground stations
      const GS = [{lat: 29.56, lon: -95.09, name:'Houston'},{lat: 40.44, lon: -3.95, name:'Madrid'},{lat: 35.42, lon: -116.89, name:'Goldstone'},{lat: -35.40, lon: 148.98, name:'Canberra'},{lat: 13.03, lon: 77.57, name:'Bangalore'},{lat: 67.88, lon: 21.05, name:'Kiruna'}];
      GS.forEach(gs => {
        const [x, y] = toXY(gs.lat, gs.lon);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,200,0,0.15)'; ctx.fill();
        ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 1.2; ctx.stroke();
        // Coverage ring
        ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,200,0,0.08)'; ctx.lineWidth = 1; ctx.stroke();
      });

      // Satellites
      satellites.forEach(sat => {
        const backendPos = positionsRef.current?.[sat.id];
        let lat, lon;
        if (backendPos) { lat = backendPos.lat; lon = backendPos.lon; }
        else if (sat.tle_line2) {
          const p = propagateClient(sat.tle_line2, t * 6);
          if (!p) return;
          lat = p.lat; lon = p.lon;
        } else { lat = sat.latitude || 0; lon = sat.longitude || 0; }

        const [x, y] = toXY(lat, lon);
        const isSelected = sat.id === selectedId;
        const col = statusColor(sat.status);

        if (isSelected) {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, 22);
          grd.addColorStop(0, 'rgba(0,212,255,0.35)');
          grd.addColorStop(1, 'rgba(0,212,255,0)');
          ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI*2); ctx.fill();
          // Targeting reticle
          ctx.strokeStyle = 'rgba(0,212,255,0.7)'; ctx.lineWidth = 1;
          const r2 = 14;
          [[1,0],[-1,0],[0,-1]].forEach(([dx, dy]) => {
            ctx.beginPath(); ctx.moveTo(x + dx*r2, y + dy*r2); ctx.lineTo(x + dx*(r2+6), y + dy*(r2+6)); ctx.stroke();
          });
        }

        // Dot
        ctx.beginPath(); ctx.arc(x, y, isSelected ? 5.5 : 3.5, 0, Math.PI*2);
        ctx.fillStyle = `${col}cc`; ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = isSelected ? 1.2 : 0.7; ctx.stroke();

        // Pulse for warnings
        if (sat.status === 'warning') {
          const pScale = 1 + 0.4 * Math.sin(t * 5);
          ctx.beginPath(); ctx.arc(x, y, 5.5 * pScale, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(255,82,82,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        }

        // Label for selected
        if (isSelected) {
          ctx.fillStyle = 'rgba(0,8,22,0.85)';
          const label = sat.name.length > 14 ? sat.name.slice(0,14) : sat.name;
          const tw = ctx.measureText(label).width;
          ctx.fillRect(x + 10, y - 14, tw + 8, 16);
          ctx.fillStyle = 'rgba(0,212,255,0.9)'; ctx.font = '11px monospace'; ctx.fillText(label, x + 14, y - 3);
        }
      });

      // Scale bar
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
      ctx.fillText('Map · Equirectangular · Real-time SGP4', 12, H - 8);

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [satellites, selectedId, showTracks]);

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const W = canvas.width, H = canvas.height;

    let closest = null, minD = 18;
    satellites.forEach(sat => {
      const backendPos = positionsRef.current?.[sat.id];
      let lat, lon;
      if (backendPos) { lat = backendPos.lat; lon = backendPos.lon; }
      else if (sat.tle_line2) {
        const p = propagateClient(sat.tle_line2, timeRef.current * 6);
        if (!p) return;
        lat = p.lat; lon = p.lon;
      } else { lat = sat.latitude || 0; lon = sat.longitude || 0; }

      const x = (lon + 180) / 360 * W;
      const y = (90 - lat) / 180 * H;
      const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
      if (d < minD) { minD = d; closest = sat; }
    });
    if (closest) onSelect(closest);
  }, [satellites, onSelect]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
    />
  );
}
