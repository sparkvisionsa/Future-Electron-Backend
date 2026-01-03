const e = require('express');
const mongoose = require('mongoose');

const urgentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_phone: { type: String },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  report_id: { type: String },
  source_excel_name: { type: String },
  title: String,
  batch_id: String,

  client_name: {
    type: String,
    required: [true, "client_name is required"],
    minlength: [9, "client_name must be at least 9 characters"],
    trim: true,
  },

  purpose_id: {
    type: Number,
    required: [true, "purpose_id is required"],
  },

  value_premise_id: {
    type: Number,
    required: [true, "value_premise_id is required"],
  },

  report_type: String,

  valued_at: {
    type: Date,
    required: [true, "valued_at is required"],
  },

  submitted_at: {
    type: Date,
    required: [true, "submitted_at is required"],
  },

  inspection_date: {
    type: Date,
    required: [true, "inspection_date is required"],
  },

  assumptions: Number,
  number_of_macros: Number,
  special_assumptions: Number,

  telephone: {
    type: String,
    required: [true, "telephone is required"],
    minlength: [8, "telephone must be at least 8 characters"],
    trim: true,
  },

  email: {
    type: String,
    required: [true, "email is required"],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "email must be a valid email address"],
  },

  valuers: [
    {
      valuerId: String,
      valuerName: String,
      percentage: Number
    }
  ],

  // OVERRIDE value = final_value from market
  final_value: {
    type: Number,
    required: [true, "final_value is required"],
    validate: {
      validator: function (v) {
        return typeof v === "number" && Number.isFinite(v) && v > 0; // non-zero, non-negative, only number
      },
      message: "final_value must be a valid number greater than 0",
    },
  },

  region: {
    type: String,
    required: [true, "region is required"],
    trim: true,
  },

  city: {
    type: String,
    required: [true, "city is required"],
    trim: true,
  },

  // Asset fields
  asset_id: Number,

  asset_name: {
    type: String,
    required: [true, "asset_name is required"],
    trim: true,
  },

  asset_usage: {
    type: String,
    required: [true, "asset_usage is required"],
    trim: true,
  },

  // PDF
  pdf_path: String,

  // Submission tracking
  submit_state: { type: Number, default: 0 }, // 0 = incomplete/not checked, 1 = complete
  report_status: { type: String, default: "INCOMPLETE" }, // INCOMPLETE | COMPLETE | SENT | CONFIRMED
  last_checked_at: { type: Date }
}, { timestamps: true });

// Date of Valuation must be on or before Report Issuing Date
urgentSchema.pre("validate", function () {
  if (this.valued_at && this.submitted_at) {
    const valued = new Date(this.valued_at);
    const submitted = new Date(this.submitted_at);
    if (!isNaN(valued.getTime()) && !isNaN(submitted.getTime()) && valued > submitted) {
      this.invalidate("valued_at", "Date of Valuation must be on or before Report Issuing Date");
    }
  }
  // next();
});

const UrgentReport = mongoose.model('UrgentReport', urgentSchema);

module.exports = UrgentReport;
