const e = require('express');
const mongoose = require('mongoose');

const urgentSchema = new mongoose.Schema({
  title: String,
  client_name: String,
  purpose_id: Number,
  value_premise_id: Number,
  report_type: String,
  valued_at: Date,
  submitted_at: Date,
  inspection_date: Date,
  assumptions: Number,
  special_assumptions: Number,
  telephone: String,
  email: String,

  // OVERRIDE value = final_value from market
  final_value: Number,

  region: String,
  city: String,

  // Asset fields
  asset_id: Number,
  asset_name: String,
  asset_usage: String,

  // PDF
  pdf_path: String
});
const UrgentReport = mongoose.model('UrgentReport', urgentSchema);


module.exports = UrgentReport;