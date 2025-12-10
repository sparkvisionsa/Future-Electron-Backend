// src/presentation/controllers/elrajhiBatch.controller.js
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

const UrgentReport = require("../../infrastructure/models/UrgentReport");

// ---------- helpers ----------

function normalizeKey(str) {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlaceholderPdfPath() {
  const placeholderPath = path.resolve(
    "uploads",
    "static",
    "dummy_placeholder.pdf"
  );

  if (!fs.existsSync(placeholderPath)) {
    throw new Error(
      "Placeholder PDF missing at uploads/static/dummy_placeholder.pdf"
    );
  }

  return placeholderPath;
}


// 🔹 Same mojibake fix you used in processUpload
function fixMojibake(str) {
  if (!str) return "";
  // reinterpret string bytes as latin1, then decode as utf8
  return Buffer.from(str, "latin1").toString("utf8");
}

function parseExcelDate(value) {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
    const msPerDay = 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + value * msPerDay);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const serial = parseInt(trimmed, 10);
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + serial * msPerDay);
    }

    const parts = trimmed.split(/[\/\-]/).map((p) => p.trim());
    if (parts.length !== 3) return null;

    const [d, m, y] = parts.map((p) => parseInt(p, 10));
    if (!d || !m || !y) return null;

    return new Date(y, m - 1, d);
  }

  return null;
}

function ensureTempPdf(batch_id, assetId) {
  const tempDir = path.join("uploads", "temp");
  fs.mkdirSync(tempDir, { recursive: true });

  const tempFileName = `temp-${batch_id}-${assetId}.pdf`;
  const tempPath = path.join(tempDir, tempFileName);

  if (!fs.existsSync(tempPath)) {
    fs.writeFileSync(tempPath, ""); // empty placeholder
  }

  return path.resolve(tempPath);
}

function convertArabicDigits(str) {
  if (typeof str !== "string") return str;
  const map = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };
  return str.replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

/**
 * Detect valuer column sets from headers.
 * We require base headers:
 *   valuerId, valuerName, percentage
 * Excel will rename duplicates as valuerId_1, valuerId_2, etc.
 */
function detectValuerColumnsOrThrow(exampleRow) {
  const keys = Object.keys(exampleRow || {});
  const idKeys = [];
  const nameKeys = [];
  const pctKeys = [];

  for (const k of keys) {
    const base = k.split("_")[0]; // e.g. "valuerId" from "valuerId_1"
    const lowerBase = base.toLowerCase();

    if (lowerBase === "valuerid") {
      idKeys.push(k);
    } else if (lowerBase === "valuername") {
      nameKeys.push(k);
    } else if (lowerBase === "percentage") {
      pctKeys.push(k);
    }
  }

  idKeys.sort();
  nameKeys.sort();
  pctKeys.sort();

  const hasBaseId = idKeys.some((k) => k.split("_")[0] === "valuerId");
  const hasBaseName = nameKeys.some((k) => k.split("_")[0] === "valuerName");
  const hasBasePct = pctKeys.some((k) => k.split("_")[0] === "percentage");

  if (!hasBaseId || !hasBaseName || !hasBasePct) {
    throw new Error(
      "Market sheet must contain headers 'valuerId', 'valuerName', and 'percentage'. " +
      "If there are multiple valuers, Excel will create valuerId_1, valuerId_2, etc."
    );
  }

  return { idKeys, nameKeys, pctKeys };
}

/**
 * Build valuers[] for a given asset row using detected column keys.
 * Example:
 *   idKeys    = ["valuerId", "valuerId_1", "valuerId_2"]
 *   nameKeys  = ["valuerName", "valuerName_1", "valuerName_2"]
 *   pctKeys   = ["percentage", "percentage_1", "percentage_2"]
 */
function buildValuersForAsset(assetRow, valuerCols) {
  const { idKeys, nameKeys, pctKeys } = valuerCols;
  const maxLen = Math.max(idKeys.length, nameKeys.length, pctKeys.length);
  const valuers = [];

  for (let i = 0; i < maxLen; i++) {
    const idKey = idKeys[i];
    const nameKey = nameKeys[i];
    const pctKey = pctKeys[i];

    const id =
      idKey && Object.prototype.hasOwnProperty.call(assetRow, idKey)
        ? assetRow[idKey]
        : null;

    const name =
      nameKey && Object.prototype.hasOwnProperty.call(assetRow, nameKey)
        ? assetRow[nameKey]
        : null;

    const pctRaw =
      pctKey && Object.prototype.hasOwnProperty.call(assetRow, pctKey)
        ? assetRow[pctKey]
        : null;

    const allEmpty =
      (id === null || id === "" || id === undefined) &&
      (name === null || name === "" || name === undefined) &&
      (pctRaw === null || pctRaw === "" || pctRaw === undefined);

    // skip completely empty valuers
    if (allEmpty) continue;

    const pctString = convertArabicDigits(String(pctRaw ?? "")).trim();
    if (!pctString) {
      // Skip valuers that don't provide a percentage
      continue;
    }

    const pctNum = Number(
      pctString
        .replace(/[%٪]/g, "")
        .replace(/,/g, ".")
        .trim()
    );

    if (Number.isNaN(pctNum)) {
      // Skip non-numeric percentages
      continue;
    }

    const percentage = pctNum >= 0 && pctNum <= 1 ? pctNum * 100 : pctNum;

    valuers.push({
      valuerId: id != null && id !== "" ? String(id) : "", // you can enforce non-empty later if you want
      valuerName: name || "",
      percentage,
    });
  }

  return valuers;
}

// ---------- main controller ----------

exports.processElrajhiExcel = async (req, res) => {
  try {
    // 0) Validate files
    if (!req.files || !req.files.excel || !req.files.excel[0]) {
      return res.status(400).json({
        status: "failed",
        error: "Excel file (field 'excel') is required",
      });
    }

    const userContext = req.user || {};

    const excelFile = req.files.excel[0].path;
    const pdfFiles = req.files.pdfs || [];

    // 1) Read Excel
    const workbook = xlsx.readFile(excelFile);
    const reportSheet = workbook.Sheets["Report Info"];
    const marketSheet = workbook.Sheets["market"];

    if (!reportSheet || !marketSheet) {
      return res.status(400).json({
        status: "failed",
        error: "Excel must contain sheets named 'Report Info' and 'market'",
      });
    }

    const reportInfoRows = xlsx.utils.sheet_to_json(reportSheet, { defval: "" });
    const marketRows = xlsx.utils.sheet_to_json(marketSheet, { defval: "" });

    if (!reportInfoRows.length) {
      return res.status(400).json({
        status: "failed",
        error: "Sheet 'Report Info' is empty",
      });
    }

    if (!marketRows.length) {
      return res.status(400).json({
        status: "failed",
        error: "Sheet 'market' has no asset rows",
      });
    }

    const report = reportInfoRows[0];

    // 2) Parse dates from report info
    const valued_at = parseExcelDate(
      report.valued_at ||
      report["valued_at\n"] ||
      report["Valued At"] ||
      report["valued at"]
    );
    const submitted_at = parseExcelDate(
      report.submitted_at ||
      report["submitted_at\n"] ||
      report["Submitted At"] ||
      report["submitted at"]
    );
    const inspection_date = parseExcelDate(
      report.inspection_date ||
      report["inspection_date\n"] ||
      report["Inspection Date"] ||
      report["inspection date"]
    );

    // 3) Detect valuer columns – THROW if headers DON'T match
    let valuerCols;
    try {
      valuerCols = detectValuerColumnsOrThrow(marketRows[0]);
    } catch (e) {
      return res.status(400).json({
        status: "failed",
        error: e.message,
      });
    }

    // 4) Build pdfMap from uploaded PDFs (with mojibake fix)
    const pdfMap = {};
    pdfFiles.forEach((file) => {
      const rawName = file.originalname;          // e.g. "Ø¯ Ù Øµ 1220.pdf"
      const fixedName = fixMojibake(rawName);     // "د م ص 1220.pdf" (hopefully)

      console.log("PDF rawName:", rawName);
      console.log("PDF fixedName:", fixedName);

      const baseName = path.parse(fixedName).name; // without extension
      const key = normalizeKey(baseName);
      const fullPath = path.resolve(file.path);
      pdfMap[key] = fullPath;
    });

    console.log("PDF files received:", pdfFiles.length);
    console.log("PDF map keys (normalized):", Object.keys(pdfMap));

    // 5) Generate batch_id for this upload
    const batch_id = `ELR-${Date.now()}`;

    // 6) Build docs: one per asset
    const docs = [];

    for (let index = 0; index < marketRows.length; index++) {
      const assetRow = marketRows[index];
      const rawAssetName = assetRow.asset_name;
      if (!rawAssetName) continue; // skip row if no asset_name

      // Normalize asset_name once (like trimmedCode in your other controller)
      const assetName = normalizeKey(rawAssetName);
      const asset_id = assetRow.id || index + 1;

      // value from market.final_value
      const value = Number(assetRow.final_value) || 0;

      // client_name = report.client_name + (id) + asset_name
      const baseClientName =
        report.client_name ||
        report["client_name\n"] ||
        report["Client Name"] ||
        "";
      const client_name = `${baseClientName} (${asset_id}) ${assetName}`;

      const region = assetRow.region || report.region || "";
      const city = assetRow.city || report.city || "";

      const asset_usage =
        assetRow["asset_usage_id\n"] ||
        assetRow.asset_usage_id ||
        assetRow.asset_usage ||
        "";

      // 🔹 Build valuers[] for this asset
      const valuers = buildValuersForAsset(assetRow, valuerCols);

      if (!valuers.length) {
        return res.status(400).json({
          status: "failed",
          error: `Asset "${assetName}" (row ${index + 1}) has no valuers. At least one valuer is required.`,
        });
      }

      const totalPct = valuers.reduce(
        (sum, v) => sum + (Number(v.percentage) || 0),
        0
      );

      const roundedTotal = Math.round(totalPct * 100) / 100;

      // allow tiny floating error, but must be 100
      if (Math.abs(roundedTotal - 100) > 0.001) {
        return res.status(400).json({
          status: "failed",
          error: `Asset "${assetName}" (row ${index + 1
            }) has total valuers percentage = ${roundedTotal}%. It must be exactly 100%.`,
        });
      }

      // ---- PDF resolution ----
      const assetKey = assetName; // already normalized
      let pdf_path = pdfMap[assetKey] || null;

      if (!pdf_path) {
        console.warn(
          "No PDF found for asset:",
          assetName,
          "using dummy-placeholder.pdf"
        );
        pdf_path = getPlaceholderPdfPath();
      }


      docs.push({
        batch_id,
        number_of_macros: 1,
        user_id: userContext.id,
        user_phone: userContext.phone,
        company: userContext.company || null,

        // Report-level (from Report Info)
        title: report.title,
        client_name,
        purpose_id: report.purpose_id,
        value_premise_id: report.value_premise_id,
        report_type: report.report_type,

        valued_at,
        submitted_at,
        inspection_date,

        assumptions: report.assumptions,
        special_assumptions: report.special_assumptions,
        owner_name: report.owner_name,
        telephone: report.telephone,
        email: report.email,

        region,
        city,

        // Per-asset overrides
        final_value: value,
        asset_id,
        asset_name: assetName, // store normalized name
        asset_usage,

        // Keep full market row
        asset: assetRow,

        // Structured valuers[]
        valuers,

        pdf_path,
      });
    }

    if (!docs.length) {
      return res.status(400).json({
        status: "failed",
        error: "No valid asset rows found to create reports.",
      });
    }

    // 7) Insert into DB
    const created = await UrgentReport.insertMany(docs);

    console.log("====================================");
    console.log("📦 ELRAJHI BATCH IMPORT SUCCESS");
    console.log("batch_id:", batch_id);
    console.log("Inserted reports:", created.length);
    console.log("====================================");

    // 8) Response: send the batch of reports
    return res.json({
      status: "success",
      batchId: batch_id,
      created: created.length,
      reports: created,
    });
  } catch (err) {
    console.error("Elrajhi batch upload error:", err);
    return res.status(500).json({
      status: "failed",
      error: err.message,
    });
  }
};
