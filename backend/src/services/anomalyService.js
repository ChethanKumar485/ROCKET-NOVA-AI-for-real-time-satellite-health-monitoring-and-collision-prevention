/**
 * Isolation Forest anomaly detection
 * Detects anomalies in satellite telemetry using unsupervised ML
 */

class IsolationTree {
  constructor(data, maxDepth, currentDepth = 0) {
    this.size = data.length;
    if (currentDepth >= maxDepth || data.length <= 1) {
      this.isLeaf = true; return;
    }
    const featureIdx = Math.floor(Math.random() * data[0].length);
    const vals = data.map(d => d[featureIdx]);
    const min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { this.isLeaf = true; return; }
    this.splitFeature = featureIdx;
    this.splitValue = min + Math.random() * (max - min);
    const left = data.filter(d => d[featureIdx] < this.splitValue);
    const right = data.filter(d => d[featureIdx] >= this.splitValue);
    this.left = new IsolationTree(left, maxDepth, currentDepth + 1);
    this.right = new IsolationTree(right, maxDepth, currentDepth + 1);
  }
  pathLength(point, depth = 0) {
    if (this.isLeaf) return depth + cFactor(this.size);
    return point[this.splitFeature] < this.splitValue
      ? this.left.pathLength(point, depth + 1)
      : this.right.pathLength(point, depth + 1);
  }
}

function cFactor(n) {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
}

export class IsolationForest {
  constructor(nTrees = 100, sampleSize = 256) {
    this.nTrees = nTrees;
    this.sampleSize = sampleSize;
    this.trees = [];
    this.fitted = false;
  }

  fit(data) {
    this.trees = [];
    const maxDepth = Math.ceil(Math.log2(this.sampleSize));
    for (let i = 0; i < this.nTrees; i++) {
      const sample = [];
      for (let j = 0; j < Math.min(this.sampleSize, data.length); j++) {
        sample.push(data[Math.floor(Math.random() * data.length)]);
      }
      this.trees.push(new IsolationTree(sample, maxDepth));
    }
    this.fitted = true;
    return this;
  }

  score(point) {
    if (!this.fitted) return 0;
    const avgPath = this.trees.reduce((sum, t) => sum + t.pathLength(point), 0) / this.nTrees;
    return Math.pow(2, -avgPath / cFactor(this.sampleSize));
  }

  // Score 0-100, higher = more anomalous
  anomalyScore(point) {
    return Math.round(this.score(point) * 100);
  }
}

// Normalize telemetry features to [0,1]
export function normalizeTelemetry(tel) {
  return [
    tel.health / 100,
    tel.battery / 100,
    tel.fuel / 100,
    (tel.temperature + 20) / 120,
    tel.signal_strength / 100,
    tel.solar_power / 100,
    tel.data_rate_mbps / 100,
  ];
}

// Train global forest on fleet data
let globalForest = null;
let forestTrainedAt = 0;

export function trainFleetModel(satellites) {
  const data = satellites.map(s => normalizeTelemetry(s));
  globalForest = new IsolationForest(100, Math.min(256, data.length)).fit(data);
  forestTrainedAt = Date.now();
  return globalForest;
}

export function scoreAnomaly(sat) {
  if (!globalForest) return 0;
  return globalForest.anomalyScore(normalizeTelemetry(sat));
}

export function getForestAge() {
  return Date.now() - forestTrainedAt;
}

// Rule-based anomaly detection for specific alerts
export function checkRuleBasedAnomalies(sat) {
  const alerts = [];
  if (sat.battery < 20) alerts.push({ feature: 'battery', value: sat.battery, severity: 'critical', msg: `Critical battery: ${sat.battery.toFixed(1)}%` });
  else if (sat.battery < 35) alerts.push({ feature: 'battery', value: sat.battery, severity: 'warning', msg: `Low battery: ${sat.battery.toFixed(1)}%` });
  if (sat.health < 40) alerts.push({ feature: 'health', value: sat.health, severity: 'critical', msg: `Critical health: ${sat.health.toFixed(1)}%` });
  else if (sat.health < 60) alerts.push({ feature: 'health', value: sat.health, severity: 'warning', msg: `Degraded health: ${sat.health.toFixed(1)}%` });
  if (sat.temperature > 75) alerts.push({ feature: 'temperature', value: sat.temperature, severity: 'critical', msg: `Thermal alarm: ${sat.temperature.toFixed(1)}°C` });
  else if (sat.temperature > 55) alerts.push({ feature: 'temperature', value: sat.temperature, severity: 'warning', msg: `High temperature: ${sat.temperature.toFixed(1)}°C` });
  if (sat.temperature < -30) alerts.push({ feature: 'temperature', value: sat.temperature, severity: 'warning', msg: `Low temperature: ${sat.temperature.toFixed(1)}°C` });
  if (sat.signal_strength < 20) alerts.push({ feature: 'signal', value: sat.signal_strength, severity: 'critical', msg: `Signal loss: ${sat.signal_strength.toFixed(1)}%` });
  if (sat.fuel < 10) alerts.push({ feature: 'fuel', value: sat.fuel, severity: 'warning', msg: `Low fuel: ${sat.fuel.toFixed(1)}%` });
  return alerts;
}
