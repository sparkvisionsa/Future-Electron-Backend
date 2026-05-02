const express = require("express");
const mongoose = require("mongoose");

const UrgentReport = require("../../infrastructure/models/UrgentReport");

const router = express.Router();

const normalizeReport = (report = {}) => {
  const doc =
    typeof report.toObject === "function" ? report.toObject() : { ...report };
  const id = doc._id ? String(doc._id) : doc.id ? String(doc.id) : "";
  return {
    ...doc,
    _id: id,
    id,
    asset_name: doc.asset_original_name || doc.asset_name || "",
  };
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const buildReportLookup = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return isObjectId(raw)
    ? { $or: [{ _id: raw }, { report_id: raw }] }
    : { report_id: raw };
};

const sendBatchReports = async (req, res, batchId) => {
  try {
    const reports = await UrgentReport.find({ batch_id: batchId })
      .sort({ asset_id: 1, createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      status: "success",
      batchId,
      reports: reports.map(normalizeReport),
    });
  } catch (err) {
    console.error("[new-scripts compat] batch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

router.get("/batch/:batchId", async (req, res) => {
  return sendBatchReports(req, res, req.params.batchId);
});

router.get("/urgent-batch/:batchId", async (req, res) => {
  return sendBatchReports(req, res, req.params.batchId);
});

router.get("/report-id/:reportId", async (req, res) => {
  try {
    const query = buildReportLookup(req.params.reportId);
    if (!query) {
      return res.status(400).json({ success: false, error: "reportId is required" });
    }

    const report = await UrgentReport.findOne(query).lean();
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const normalized = normalizeReport(report);
    return res.json({
      success: true,
      status: "success",
      data: normalized,
      report: normalized,
      collection: "UrgentReport",
    });
  } catch (err) {
    console.error("[new-scripts compat] report-id error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/id/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    if (!isObjectId(recordId)) {
      return res.status(400).json({ success: false, error: "Invalid recordId" });
    }

    const report = await UrgentReport.findById(recordId).lean();
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    const normalized = normalizeReport(report);
    return res.json({
      success: true,
      status: "success",
      data: normalized,
      report: normalized,
      collection: "UrgentReport",
    });
  } catch (err) {
    console.error("[new-scripts compat] id error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/bulk/report_id", async (req, res) => {
  try {
    const ids = Array.isArray(req.body) ? req.body : req.body?.report_ids;
    const reportIds = (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);

    const reports = reportIds.length
      ? await UrgentReport.find({ report_id: { $in: reportIds } }).lean()
      : [];

    return res.json({
      success: true,
      status: "success",
      reports: reports.map(normalizeReport),
    });
  } catch (err) {
    console.error("[new-scripts compat] bulk report_id error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/bulk", async (req, res) => {
  try {
    const ids = Array.isArray(req.body)
      ? req.body
      : req.body?.record_ids || req.body?.ids || [];
    const objectIds = (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || "").trim())
      .filter((id) => isObjectId(id));

    const reports = objectIds.length
      ? await UrgentReport.find({ _id: { $in: objectIds } }).lean()
      : [];

    return res.json({
      success: true,
      status: "success",
      reports: reports.map(normalizeReport),
    });
  } catch (err) {
    console.error("[new-scripts compat] bulk error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:recordId/set-report-id", async (req, res) => {
  try {
    const { recordId } = req.params;
    const reportId = String(req.body?.report_id || req.body?.reportId || "").trim();
    if (!isObjectId(recordId) || !reportId) {
      return res
        .status(400)
        .json({ success: false, error: "recordId and report_id are required" });
    }

    const report = await UrgentReport.findByIdAndUpdate(
      recordId,
      { $set: { report_id: reportId } },
      { new: true },
    ).lean();

    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    return res.json({
      success: true,
      status: "success",
      report: normalizeReport(report),
    });
  } catch (err) {
    console.error("[new-scripts compat] set-report-id error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/set-start-time-by-batch-id/:batchId", async (req, res) => {
  return res.json({
    success: true,
    status: "success",
    batchId: req.params.batchId,
  });
});

router.patch("/update-elrajhi-status/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    if (!isObjectId(recordId)) {
      return res.status(400).json({ success: false, error: "Invalid recordId" });
    }

    const update = {};
    if (req.body?.submit_state !== undefined) {
      const submitState = Number(req.body.submit_state);
      if (Number.isFinite(submitState)) update.submit_state = submitState;
    }
    if (req.body?.report_status !== undefined) {
      update.report_status = String(req.body.report_status || "").toUpperCase();
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "report_id")) {
      const reportId = String(req.body.report_id || "").trim();
      update.report_id = reportId || null;
    }
    update.last_checked_at = new Date();

    const report = await UrgentReport.findByIdAndUpdate(
      recordId,
      { $set: update },
      { new: true },
    ).lean();

    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }

    return res.json({
      success: true,
      status: "success",
      report: normalizeReport(report),
    });
  } catch (err) {
    console.error("[new-scripts compat] update status error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
