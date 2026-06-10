const fs = require("fs");
const path = require("path");

const MOCK_DATA_PATH = path.join(__dirname, "APIs", "FloodAlertsacrossSingapore.json");

function loadMock() {
  try {
    const raw = fs.readFileSync(MOCK_DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return { records: [] };
  }
}

function aggregateTrends(req, res) {
  try {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const from = params.get("from") || null;
    const to = params.get("to") || null;
    const data = loadMock();
    // For MVP, build a simple daily count of flood alerts
    const counts = {};
    (data.records || []).forEach((rec) => {
      try {
        const dateKey = (rec.datetime || '').slice(0, 10) || 'unknown';
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      } catch (e) {
        // skip malformed record
      }
    });
    const series = Object.keys(counts).sort().map((d) => ({ date: d, count: counts[d] }));
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ series, requested: { from, to }, generatedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('Analytics.aggregateTrends failed:', err && err.message);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: 'Analytics aggregation failed.' }));
  }
}

function resourcesUsage(req, res) {
  // Mock shelter/hospital utilization
  const sample = [
    { name: "NUH", type: "hospital", occupancy: 90 },
    { name: "SGH", type: "hospital", occupancy: 85 },
    { name: "Bedok Shelter", type: "shelter", occupancy: 76 },
    { name: "Expo Hall 3", type: "shelter", occupancy: 12 }
  ];
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ resources: sample, generatedAt: new Date().toISOString() }));
}

function summaryStats(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    totalIncidents: 67,
    avgResponseMins: 8,
    highRiskZones: 4,
    shelterUtilisation: 82
  }));
}

function aiInsights(req, res) {
  const insights = [
    {
      title: 'Flood Risk Increase',
      riskLevel: 'CRITICAL',
      recommendations: [
        'Expand shelter capacity',
        'Increase drainage monitoring',
        'Pre-deploy logistics volunteers'
      ]
    },
    {
      title: 'Fire Response Delays',
      riskLevel: 'MEDIUM',
      recommendations: [
        'Re-route emergency vehicles',
        'Increase responder standby hours',
        'Improve dispatch coordination'
      ]
    },
    {
      title: 'Emerging Hotspot Zones',
      riskLevel: 'HIGH',
      recommendations: [
        'Increase surveillance coverage',
        'Upgrade emergency infrastructure',
        'Prioritize resource allocation'
      ]
    },
    {
      title: 'Hospital Capacity Pressure',
      riskLevel: 'CRITICAL',
      recommendations: [
        'Activate overflow facilities',
        'Redirect non-critical patients',
        'Deploy standby medical volunteers'
      ]
    },
    {
      title: 'Volunteer Availability Decline',
      riskLevel: 'MEDIUM',
      recommendations: [
        'Expand volunteer outreach',
        'Improve shift coordination',
        'Activate reserve responder pool'
      ]
    }
  ];
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ insights, generatedAt: new Date().toISOString() }));
}

module.exports = { aggregateTrends, resourcesUsage, summaryStats, aiInsights };
