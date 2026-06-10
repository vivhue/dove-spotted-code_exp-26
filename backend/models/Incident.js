const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  reporter: { type: String, trim: true, default: 'anonymous' },
  reporterRole: { type: String, enum: ['public','professional','admin'], default: 'public' },
  type: { type: String, trim: true, default: 'flood' },
  severity: { type: String, enum: ['Critical','High','Medium','Low'], default: 'Low' },
  value: { type: Number, default: 20 },
  areaDesc: { type: String, trim: true },
  location: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number },
  note: { type: String },
  status: {
    type: String,
    enum: ['active','monitoring','contained','resolved','open','closed','investigating'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
