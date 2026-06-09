const { evaluate } = require("./predictEngine");
const fs = require("fs");
const path = require("path");
const Incident = require("./models/Incident");

const MOCK_DATA_PATH = path.join(__dirname, "APIs", "FloodAlertsacrossSingapore.json");

async function loadMockFloods() {
  try {
    const raw = fs.readFileSync(MOCK_DATA_PATH, "utf8");
    const json = JSON.parse(raw);
    return json.records || [];
  } catch (e) {
    return [];
  }
}

// Simple helper to build GeoJSON features per zone (mocked zones based on flood alerts)
async function handleHeatmap(req, res, cached) {
  try {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const windowHours = Number(params.get("window")) || 4;
    const records = await loadMockFloods();

    // For MVP, group by areaDesc as zoneId
    const zones = {};
    records.forEach((rec) => {
      const readingList = rec.item?.readings || [];
      readingList.forEach((reading) => {
        const zoneId = (reading.area?.areaDesc || "Unknown Zone").slice(0, 64);
        zones[zoneId] = zones[zoneId] || { observations: [], samples: 0 };
        // create an observation score 0-100 from severity mapping
        const severity = reading.severity || "Minor";
        const scoreMap = { Extreme: 95, Severe: 80, Moderate: 55, Minor: 20 };
        const val = scoreMap[severity] || 20;
        zones[zoneId].observations.push({ source: "flood-alert", type: "flood", value: val, weight: 0.6 });
        zones[zoneId].samples += 1;
      });
    });

    let features = Object.keys(zones).map((zoneId, idx) => {
      const obs = zones[zoneId].observations;
      const pred = evaluate(obs, windowHours);
      return {
        type: "Feature",
        properties: {
          zoneId,
          zoneName: zoneId,
          riskScore: pred.riskScore,
          severity: pred.severity,
          confidence: pred.confidence,
          recommendedActions: pred.recommendations
        },
        geometry: {
          type: "Point",
          coordinates: [103.7 + (idx % 10) * 0.01, 1.30 + Math.floor(idx / 10) * 0.01]
        }
      };
    });

    // If there are no features (mock file may be an OpenAPI spec), add demo zones so UI remains interactive
    if (!features.length) {
      const demoZones = [
        { zoneId: 'Jurong West Demo', coords: [103.71, 1.35], severity: 'High' },
        { zoneId: 'Clementi Demo', coords: [103.77, 1.32], severity: 'Medium' },
        { zoneId: 'Tampines Demo', coords: [103.95, 1.35], severity: 'Low' }
      ];
      features = demoZones.map((dz) => {
        const obs = [{ source: 'demo', type: 'synthetic', value: dz.severity === 'High' ? 75 : dz.severity === 'Medium' ? 50 : 20, weight: 0.6 }];
        const pred = evaluate(obs, windowHours);
        return {
          type: 'Feature',
          properties: {
            zoneId: dz.zoneId,
            zoneName: dz.zoneId,
            riskScore: pred.riskScore,
            severity: pred.severity,
            confidence: pred.confidence,
            recommendedActions: pred.recommendations
          },
          geometry: { type: 'Point', coordinates: dz.coords }
        };
      });
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ type: "FeatureCollection", features, fetchedAt: new Date().toISOString() }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Failed to build heatmap." }));
  }
}

async function handlePredict(req, res) {
  try {
    const body = await new Promise((resolve, reject) => {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => resolve(b ? JSON.parse(b) : {}));
      req.on("error", reject);
    });
    const zone = body.zone || "Unknown Zone";
    const hours = Number(body.hours) || 4;

    // For MVP, reuse mock floods to create observations for that zone
    const records = await loadMockFloods();
    const observations = [];
    records.forEach((rec) => {
      (rec.item?.readings || []).forEach((reading) => {
        const zoneId = (reading.area?.areaDesc || "Unknown Zone").slice(0, 64);
        if (zoneId === zone) {
          const severity = reading.severity || "Minor";
          const scoreMap = { Extreme: 95, Severe: 80, Moderate: 55, Minor: 20 };
          const val = scoreMap[severity] || 20;
          observations.push({ source: "flood-alert", type: "flood", value: val, weight: 0.6 });
        }
      });
    });

    // fallback: if no observations, add a low-monitoring observation
    if (!observations.length) observations.push({ source: "mock", type: "monitor", value: 10, weight: 0.2 });

    const pred = evaluate(observations, hours);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ zone, ...pred, observedSamples: observations.length }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Prediction failed." }));
  }
}


// ---- DB backed handlers ----
async function handleHeatmapDb(req, res) {
  try {
    // query recent incidents from MongoDB and convert to features
    const incidents = await Incident.find().sort({ createdAt: -1 }).limit(200).lean();
    const features = incidents.map((inc, idx) => {
      const obs = [{ source: 'db', type: inc.type || 'report', value: Number(inc.value) || (inc.severity === 'High' ? 80 : inc.severity === 'Medium' ? 50 : 20), weight: 0.7 }];
      const pred = evaluate(obs, 4);
      return {
        type: 'Feature',
        properties: {
          zoneId: inc._id.toString(),
          zoneName: inc.areaDesc || inc.location || `Reported ${inc._id}`,
          riskScore: pred.riskScore,
          severity: pred.severity,
          confidence: pred.confidence,
          recommendedActions: pred.recommendations
        },
        geometry: { type: 'Point', coordinates: [inc.lng || 103.82, inc.lat || 1.35] }
      };
    });

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ type: 'FeatureCollection', features, fetchedAt: new Date().toISOString() }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: 'Failed to build DB heatmap.' }));
  }
}

async function handlePredictDb(req, res) {
  try {
    const body = await new Promise((resolve, reject) => {
      let b = '';
      req.on('data', (c) => (b += c));
      req.on('end', () => resolve(b ? JSON.parse(b) : {}));
      req.on('error', reject);
    });
    const zoneId = body.zone || null;
    let inc = null;
    if (zoneId) inc = await Incident.findById(zoneId).lean();
    if (!inc) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: 'Report not found' }));
      return;
    }
    const obs = [{ source: 'db', type: inc.type || 'report', value: Number(inc.value) || (inc.severity === 'High' ? 80 : inc.severity === 'Medium' ? 50 : 20), weight: 0.7 }];
    const pred = evaluate(obs, Number(body.hours) || 4);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ zone: inc._id.toString(), ...pred, observedSamples: 1 }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: 'DB prediction failed.' }));
  }
}

module.exports = { handleHeatmap, handlePredict, handleHeatmapDb, handlePredictDb };
