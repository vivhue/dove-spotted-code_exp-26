const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  context: { type: String, trim: true, required: true },
  message: { type: String, trim: true },
  stack: { type: String },
  method: { type: String },
  url: { type: String },
  statusCode: { type: Number },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('ErrorLog', errorLogSchema);
