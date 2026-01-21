// routes/report.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../application/middleware/authMiddleware");
const {
    getReportsByBatchId,
    findReportByReportId,
    findReportById,
    updateMacroSubmitState,
    markAllMacrosComplete,
    updateReportStatus,
    recomputeReportStatus,
    updateReportWithMacroIds,
} = require("../controllers/newScript.controller");

// GET /api/reports/batch/:batch_id
router.get("/batch/:batch_id", authMiddleware, getReportsByBatchId);

// GET /api/reports/report-id/:report_id
router.get("/report-id/:report_id", authMiddleware, findReportByReportId);

// GET /api/reports/:id
router.get("/:id", authMiddleware, findReportById);

// PATCH /api/reports/:report_id/macro/:macro_id/submit-state
router.patch(
    "/:report_id/macro/:macro_id/submit-state",
    authMiddleware,
    updateMacroSubmitState
);

// PATCH /api/reports/:report_id/mark-all-complete
router.patch(
    "/:report_id/mark-all-complete",
    authMiddleware,
    markAllMacrosComplete
);

// PATCH /api/reports/:report_id/status
router.patch("/:report_id/status", authMiddleware, updateReportStatus);

// PATCH /api/reports/:report_id/recompute-status
router.patch(
    "/:report_id/recompute-status",
    authMiddleware,
    recomputeReportStatus
);

// PATCH /api/reports/:report_id/update-macros
router.patch(
    "/:report_id/update-macros",
    authMiddleware,
    updateReportWithMacroIds
);

module.exports = router;