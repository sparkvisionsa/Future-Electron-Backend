const mongoose = require("mongoose");

const DuplicateReport = require("../../infrastructure/models/DuplicateReport.js");
const ElrajhiReport = require("../../infrastructure/models/ElrajhiReport.js");
const MultiApproachReport = require("../../infrastructure/models/MultiApproachReport.js");
const SubmitReportsQuickly = require("../../infrastructure/models/SubmitReportsQuickly.js");
const UrgentReport = require("../../infrastructure/models/UrgentReport.js");
const Reports = require("../../infrastructure/models/report.js");

function normalizeReport(doc, source) {
  return {
    source,
    _id: doc._id,
    report_id: doc.report_id ?? doc.reportId ?? null,
    title: doc.title ?? doc.report_title ?? doc.name ?? null,
    user_id: doc.user_id ?? null,
    company: doc.company ?? null,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    raw: doc,
  };
}

async function lookupReportByReportId(req, res) {
  try {
    const userIdStr = req.userId; // ✅ from your middleware

    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(401).json({ status: "failed", error: "Unauthorized" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userIdStr);

    const reportId = String(req.query.report_id || "").trim();
    if (!reportId) {
      return res.status(400).json({ status: "failed", error: "report_id is required" });
    }

    const sources = [
      { name: "DuplicateReport", model: DuplicateReport, idKey: "report_id" },
      { name: "ElrajhiReport", model: ElrajhiReport, idKey: "report_id" },
      { name: "MultiApproachReport", model: MultiApproachReport, idKey: "report_id" },
      { name: "SubmitReportsQuickly", model: SubmitReportsQuickly, idKey: "report_id" },
      { name: "UrgentReport", model: UrgentReport, idKey: "report_id" },
      { name: "Reports", model: Reports, idKey: "report_id" },
    ];

    for (const s of sources) {
      const doc = await s.model
        .findOne({ [s.idKey]: reportId, user_id: userObjectId })
        .lean()
        .exec();

      if (doc) {
        return res.json({ status: "success", data: normalizeReport(doc, s.name) });
      }
    }

    return res.status(404).json({
      status: "failed",
      error: "Report not found for this user in any collection",
    });
  } catch (err) {
    console.error("lookupReportByReportId error:", err);
    return res.status(500).json({ status: "failed", error: err.message || "Server error" });
  }
}

async function listMyReports(req, res) {
  try {
    const userIdStr = req.userId; // ✅ from your middleware

    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(401).json({ status: "failed", error: "Unauthorized" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userIdStr);

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const sources = [
      { name: "DuplicateReport", model: DuplicateReport },
      { name: "ElrajhiReport", model: ElrajhiReport },
      { name: "MultiApproachReport", model: MultiApproachReport },
      { name: "SubmitReportsQuickly", model: SubmitReportsQuickly },
      { name: "UrgentReport", model: UrgentReport },
       { name: "Reports", model: Reports },
    ];

    const perSourceLimit = Math.ceil(limit / sources.length) + 10;

    const results = await Promise.all(
      sources.map(async (s) => {
        const docs = await s.model
          .find({ user_id: userObjectId })
          .sort({ createdAt: -1 })
          .limit(perSourceLimit)
          .lean()
          .exec();
        return docs.map((d) => normalizeReport(d, s.name));
      })
    );

    const merged = results.flat();
    merged.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    const paged = merged.slice(skip, skip + limit);

    return res.json({
      status: "success",
      page,
      limit,
      totalApprox: merged.length,
      data: paged,
    });
  } catch (err) {
    console.error("listMyReports error:", err);
    return res.status(500).json({ status: "failed", error: err.message || "Server error" });
  }
}

module.exports = {
  lookupReportByReportId,
  listMyReports,
};
