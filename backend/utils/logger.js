const mongoose = require('mongoose');
const ErrorLog = require('../models/ErrorLog');

function logError(context, error, meta = {}) {
  console.error(`[${context}]`, error && error.message ? error.message : error);

  if (mongoose.connection.readyState !== 1) return;

  ErrorLog.create({
    context,
    message: error && error.message,
    stack: error && error.stack,
    method: meta.method,
    url: meta.url,
    statusCode: meta.statusCode,
    meta
  }).catch((err) => {
    console.error('[logger] failed to persist error log:', err.message);
  });
}

module.exports = { logError };
