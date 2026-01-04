const mongoose = require('mongoose');

const ValuerSchema = new mongoose.Schema(
  {
    valuerName: { type: String },
    percentage: { type: Number },
  },
  { _id: false }
);

const AssetSchema = new mongoose.Schema(
  {
    id: { type: String },
    asset_id: { type: Number },
    asset_name: { type: String, required: true },
    asset_usage_id: { type: Number, required: true },
    asset_type: { type: String, default: "0" },

    // Repeated high-level fields (copied from parent report)
    region: { type: String, required: true },
    city: { type: String, required: true },
    inspection_date: { type: String, required: true }, // yyyy-mm-dd
    owner_name: { type: String, default: "0" },

    source_sheet: {
      type: String,
      enum: ["market", "cost"],
      required: true,
    },

    final_value: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => Number.isInteger(v),
        message: "final_value must be an integer.",
      },
    },
    pg_no: { type: String },
    submitState: { type: Number },

    // Flags & values for approaches
    market_approach: { type: String, default: "0" },
    market_approach_value: { type: String, default: "0" },

    cost_approach: { type: String, default: "0" },
    cost_approach_value: { type: String, default: "0" },

    production_capacity: { type: String, default: "0" },
    production_capacity_measuring_unit: { type: String, default: "0" },
    product_type: { type: String, default: "0" },

  },
  { _id: false }
);

const SubmitReportsQuicklySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user_phone: { type: String },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    report_id: { type: String, default: "" },
    source_excel_name: { type: String },
    title: { type: String, required: true },
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
      default: 1,
    },

    value_premise_id: {
      type: Number,
      required: [true, "value_premise_id is required"],
      default: 1,
    },

    report_type: {
      type: String,
      required: [true, "report_type is required"],
      default: "تقرير مفصل",
    },

    // Store as yyyy-mm-dd string (not Date)
    valued_at: {
      type: String,
      required: [true, "valued_at is required"],
    },

    submitted_at: {
      type: String,
      required: [true, "submitted_at is required"],
    },

    inspection_date: {
      type: String,
      required: [true, "inspection_date is required"],
    },

    assumptions: {
      type: Number,
      default: 0,
    },

    special_assumptions: {
      type: Number,
      default: 0,
    },

    number_of_macros: {
      type: Number,
      default: 0,
    },

    telephone: {
      type: String,
      required: [true, "telephone is required"],
      default: "999999999",
      minlength: [8, "telephone must be at least 8 characters"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "email is required"],
      default: "a@a.com",
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "email must be a valid email address"],
    },

    region: { type: String },
    city: { type: String },

    valuers: {
      type: [ValuerSchema],
      default: [],
    },

    final_value: {
      type: Number,
      required: [true, "final_value is required"],
      validate: {
        validator: function (v) {
          return typeof v === "number" && Number.isFinite(v) && v > 0;
        },
        message: "final_value must be a valid number greater than 0",
      },
    },

    // All assets combined
    asset_data: {
      type: [AssetSchema],
      default: [],
    },

    // PDF path
    pdf_path: {
      type: String,
      default: "",
    },

    // Submission tracking
    submit_state: { type: Number, default: 0 },
    report_status: { type: String, default: "new" }, // new | INCOMPLETE | COMPLETE | SENT | CONFIRMED
    last_checked_at: { type: Date },
    checked: { type: Boolean, default: false },
    startSubmitTime: { type: Date },
    endSubmitTime: { type: Date },
    pg_count: { type: Number },
  },
  { timestamps: true }
);

// Date validation: valued_at must be <= submitted_at
SubmitReportsQuicklySchema.pre("validate", function () {
  const doc = this;

  if (doc.valued_at && doc.submitted_at) {
    const valued = new Date(doc.valued_at);
    const submitted = new Date(doc.submitted_at);
    if (!isNaN(valued.getTime()) && !isNaN(submitted.getTime()) && valued > submitted) {
      this.invalidate("valued_at", "Date of Valuation must be on or before Report Issuing Date");
    }
  }
});

// Copy selected fields into each asset before save
SubmitReportsQuicklySchema.pre("save", function () {
  const doc = this;

  // Normalize dates to yyyy-mm-dd strings
  if (doc.valued_at instanceof Date) {
    const yyyy = doc.valued_at.getFullYear();
    const mm = String(doc.valued_at.getMonth() + 1).padStart(2, "0");
    const dd = String(doc.valued_at.getDate()).padStart(2, "0");
    doc.valued_at = `${yyyy}-${mm}-${dd}`;
  }

  if (doc.submitted_at instanceof Date) {
    const yyyy = doc.submitted_at.getFullYear();
    const mm = String(doc.submitted_at.getMonth() + 1).padStart(2, "0");
    const dd = String(doc.submitted_at.getDate()).padStart(2, "0");
    doc.submitted_at = `${yyyy}-${mm}-${dd}`;
  }

  if (doc.inspection_date instanceof Date) {
    const yyyy = doc.inspection_date.getFullYear();
    const mm = String(doc.inspection_date.getMonth() + 1).padStart(2, "0");
    const dd = String(doc.inspection_date.getDate()).padStart(2, "0");
    doc.inspection_date = `${yyyy}-${mm}-${dd}`;
  }

  // Copy selected fields into each asset
  if (Array.isArray(doc.asset_data)) {
    doc.asset_data.forEach((asset) => {
      if (!asset) return;

      asset.region = doc.region || asset.region || "";
      asset.city = doc.city || asset.city || "";
      asset.owner_name = asset.owner_name || "0"; // Default to "0"
      if (doc.inspection_date) {
        asset.inspection_date = doc.inspection_date;
      }
    });
  }
});

const SubmitReportsQuickly = mongoose.model('SubmitReportsQuickly', SubmitReportsQuicklySchema);

module.exports = SubmitReportsQuickly;

