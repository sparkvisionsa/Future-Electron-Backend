const mongoose = require("mongoose");

const AdSchema = new mongoose.Schema(
  {
    haraj_id: { type: String, index: true, unique: true, sparse: true },
    adId: { type: String, index: true },
    url: { type: String },

    title: { type: String },
    city: { type: String },
    postedRelativeTime: { type: String },

    authorName: { type: String },
    authorUrl: { type: String },

    price: { type: Number },
    currency: { type: String },

    description: { type: String },

    contact: {
      phone: { type: String, default: null },
    },

    images: { type: Array, default: [] },
    comments: { type: Array, default: [] },

    lastScrapedAt: { type: Date, default: null },
    tracking: {
      startedAt: { type: Date, default: null },
      until: { type: Date, default: null },
      active: { type: Boolean, default: true },
    },

    scrapeRuns: { type: Array, default: [] },
  },
  {
    timestamps: true,
    collection: "ads", // ✅ must match your Mongo collection name
    strict: false,     // ✅ allow extra fields
  }
);

module.exports = mongoose.models.Ad || mongoose.model("Ad", AdSchema);
