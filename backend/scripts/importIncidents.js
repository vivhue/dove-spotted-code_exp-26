const path = require('path');
const fs = require('fs');
const connectDB = require('../config/db');
const Incident = require('../models/Incident');

async function run() {
  const connected = await connectDB();
  if (!connected) {
    console.error('MongoDB not connected. Set MONGO_URI in .env');
    process.exit(1);
  }

  const fpath = path.join(__dirname, '..', 'data', 'compass-incidents.json');
  if (!fs.existsSync(fpath)) {
    console.error('Import file not found at', fpath);
    process.exit(1);
  }

  const raw = fs.readFileSync(fpath, 'utf8');
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse JSON:', err.message);
    process.exit(1);
  }

  const docs = arr.map((r) => ({
    reporter: r.reporter || 'anonymous',
    reporterRole: r.reporterRole || 'public',
    type: r.type || 'report',
    severity: r.severity || 'Low',
    value: r.value || 20,
    areaDesc: r.areaDesc || r.location || '',
    location: r.location || r.areaDesc || '',
    lat: r.lat,
    lng: r.lng,
    note: r.note || '',
    status: r.status || 'open'
  }));

  try {
    const inserted = await Incident.insertMany(docs, { ordered: false });
    console.log('Inserted', inserted.length, 'documents');
  } catch (err) {
    console.error('Import encountered errors:', err.message || err);
  } finally {
    process.exit(0);
  }
}

run();
