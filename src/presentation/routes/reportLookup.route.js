const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware"); // ✅ same middleware you shared

const {
  searchReports,
  listMyReports,
} = require("../controllers/reportLookup.controller");

// 🔍 Find report + know which collection it belongs to
// GET /api/report-lookup/search?q=1598923&page=1&limit=20&source=ALL
router.get("/search", auth, searchReports);

// 📄 List all reports of logged-in user across collections
// GET /api/report-lookup/mine?limit=20&page=1
router.get("/mine", auth, listMyReports);

module.exports = router;
