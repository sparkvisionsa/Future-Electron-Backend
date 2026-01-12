const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware"); // ✅ same middleware you shared

const {
  lookupReportByReportId,
  listMyReports,
} = require("../controllers/reportLookup.controller");

// 🔍 Find report + know which collection it belongs to
// GET /api/report-lookup/lookup?report_id=1598923
router.get("/lookup", auth, lookupReportByReportId);

// 📄 List all reports of logged-in user across collections
// GET /api/report-lookup/mine?limit=20&page=1
router.get("/mine", auth, listMyReports);

module.exports = router;
