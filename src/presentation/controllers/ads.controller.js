const Ad = require("../../infrastructure/models/Ad");

/**
 * GET /api/ads/all
 * Query:
 *  - page=1
 *  - limit=500 (max 5000)
 */
async function getAllAds(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || "500", 10) || 500;
    const limit = Math.min(Math.max(limitRaw, 1), 5000);

    const [items, total] = await Promise.all([
      Ad.find({})
        .sort({ lastScrapedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Ad.countDocuments({}),
    ]);

    return res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items, // ✅ all fields
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

module.exports = { getAllAds };
