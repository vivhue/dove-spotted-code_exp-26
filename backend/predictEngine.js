/**
 * Simple rule-based prediction engine (MVP).
 * Exposes evaluate(zoneObservations, windowHours) -> { riskScore, severity, confidence, recommendations }
 */
const SEVERITY_THRESHOLDS = {
  Critical: 85,
  High: 65,
  Medium: 40,
  Low: 0
};

function weightedScore(observations = []) {
  // observations: [{ source, type, value, weight }]
  if (!observations.length) return 0;
  let totalWeight = 0;
  let weighted = 0;
  for (const obs of observations) {
    const w = typeof obs.weight === 'number' ? obs.weight : 1;
    const v = Number(obs.value) || 0;
    weighted += v * w;
    totalWeight += w;
  }
  return totalWeight ? Math.round((weighted / totalWeight) * 1) : 0;
}

function scoreToSeverity(score) {
  if (score >= SEVERITY_THRESHOLDS.Critical) return 'Critical';
  if (score >= SEVERITY_THRESHOLDS.High) return 'High';
  if (score >= SEVERITY_THRESHOLDS.Medium) return 'Medium';
  return 'Low';
}

function recommendationsFor(severity) {
  const map = {
    Critical: [
      'Activate nearest large-capacity shelter',
      'Pre-deploy medical teams',
      'Broadcast immediate evacuation advisory'
    ],
    High: [
      'Pre-deploy logistics volunteers',
      'Prepare nearby shelters',
      'Issue early flood advisory'
    ],
    Medium: [
      'Monitor situation and ready volunteers',
      'Alert nearby hospitals to prepare surge capacity'
    ],
    Low: ['Monitor sensors and social reports']
  };
  return map[severity] || [];
}

function evaluate(zoneObservations = [], windowHours = 4) {
  // zoneObservations: array of observation objects with normalized scores 0-100
  // For MVP, compute a simple average of weighted observation values
  const score = weightedScore(zoneObservations);
  const severity = scoreToSeverity(score);
  // Confidence heuristic: more observations -> higher confidence
  const confidence = Math.min(0.95, 0.4 + Math.log10(Math.max(1, zoneObservations.length)) * 0.2);
  const recs = recommendationsFor(severity);
  const timeToImpact = (() => {
    if (severity === 'Critical') return '0-2h';
    if (severity === 'High') return '1-4h';
    if (severity === 'Medium') return '4-12h';
    return '12-48h';
  })();

  return {
    riskScore: Math.max(0, Math.min(100, score)),
    severity,
    confidence: Number(confidence.toFixed(2)),
    recommendations: recs,
    timeToImpact
  };
}

module.exports = { evaluate };
