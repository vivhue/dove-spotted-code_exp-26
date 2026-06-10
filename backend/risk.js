const { evaluate } = require("./predictEngine");
const fs = require("fs");
const path = require("path");
const Incident = require("./models/Incident");

const MOCK_DATA_PATH = path.join(__dirname, "APIs", "FloodAlertsacrossSingapore.json");
const FLOOD_ALERTS_URL = "https://api-open.data.gov.sg/v2/real-time/api/weather/flood-alerts";

async function loadMockFloods() {
  try {
    const raw = fs.readFileSync(MOCK_DATA_PATH, "utf8");
    const json = JSON.parse(raw);
    return json.records || [];
  } catch (e) {
    return [];
  }
}

async function loadLiveFloods() {
  // Allow forcing mock via environment variable for testing
  if (process.env.USE_MOCK_FLOODS === '1') return loadMockFloods();
  try {
    const resp = await fetch(FLOOD_ALERTS_URL, { method: 'GET' });
    if (!resp.ok) throw new Error(`Upstream returned ${resp.status}`);
    const payload = await resp.json();
    // The upstream may return data.records or payload.data.records depending on format
    return payload.records || payload.data?.records || [];
  } catch (e) {
    // fallback to local mock file if fetch fails
    return loadMockFloods();
  }
}

// Simple helper to build GeoJSON features per zone (mocked zones based on flood alerts)
async function handleHeatmap(req, res, cached) {
  try {
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const windowHours = Number(params.get("window")) || 4;
    const fetched = cached ? await cached('flood-alerts', 60_000, loadLiveFloods) : await loadLiveFloods();
    const records = fetched || [];

    // Build one feature per upstream record so the UI reflects live alerts.
    let features = records.map((rec, idx) => {
      // Construct a stable zone id from datetime or index
      const zoneId = (rec.datetime && String(rec.datetime)) || `record-${idx}`;
      const zoneName = rec.item?.type || rec.item?.description || `Alert ${idx + 1}`;
      // If record has readings, derive observations from them; otherwise create a single observation
      const readingList = rec.item?.readings || [];
      const observations = [];
      if (readingList.length) {
        readingList.forEach((reading) => {
          const severity = reading.severity || "Minor";
          const scoreMap = { Extreme: 95, Severe: 80, Moderate: 55, Minor: 20 };
          const val = scoreMap[severity] || 20;
          observations.push({ source: "flood-alert", type: reading.type || "flood", value: val, weight: 0.6 });
        });
      } else {
        // fallback single observation so the alert is visible on the map
        observations.push({ source: "flood-alert", type: rec.item?.type || 'observation', value: 60, weight: 0.6 });
      }
      const pred = evaluate(observations, windowHours);
      return {
        type: "Feature",
        properties: {
          zoneId,
          zoneName,
          riskScore: pred.riskScore,
          severity: pred.severity,
          confidence: pred.confidence,
          recommendedActions: pred.recommendations,
          description: rec.item?.description || `Upstream alert at ${rec.datetime || 'unknown time'}`,
          explanation: pred.explanation || ''
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
            recommendedActions: pred.recommendations,
            description: 'Demo synthetic observation',
            explanation: pred.explanation || ''
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

    // Reuse live records and find the matching record by our generated zone id
    const fetched = cached ? await cached('flood-alerts', 60_000, loadLiveFloods) : await loadLiveFloods();
    const records = fetched || [];
    const observations = [];
    records.forEach((rec, idx) => {
      const zoneId = (rec.datetime && String(rec.datetime)) || `record-${idx}`;
      if (zoneId === zone) {
        const readingList = rec.item?.readings || [];
        if (readingList.length) {
          readingList.forEach((reading) => {
            const severity = reading.severity || "Minor";
            const scoreMap = { Extreme: 95, Severe: 80, Moderate: 55, Minor: 20 };
            const val = scoreMap[severity] || 20;
            observations.push({ source: "flood-alert", type: reading.type || "flood", value: val, weight: 0.6 });
          });
        } else {
          observations.push({ source: "flood-alert", type: rec.item?.type || 'observation', value: 60, weight: 0.6 });
        }
      }
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
          recommendedActions: pred.recommendations,
          description: inc.note || inc.areaDesc || inc.location || 'No description provided',
          explanation: pred.explanation || '',
          // Include incident fields so the frontend can show full details without
          // needing a separate API call.
          incident: {
            _id: inc._id,
            reporter: inc.reporter,
            reporterRole: inc.reporterRole,
            type: inc.type,
            severity: inc.severity,
            value: inc.value,
            areaDesc: inc.areaDesc,
            location: inc.location,
            note: inc.note,
            status: inc.status,
            createdAt: inc.createdAt,
            updatedAt: inc.updatedAt
          }
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
