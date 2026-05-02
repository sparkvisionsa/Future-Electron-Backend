const express = require("express");
const userRoutes = require("../routes/user.routes");
const systemRoutes = require("../routes/system.routes");
const updateRoutes = require("./update.routes");
const companesRoutes = require("../routes/companes.routes");
const uploadRoute = require("../routes/upload.route");
const elrajhiUploadRoute = require("../routes/elrajhiUpload.route");
const submitReportsQuicklyRoutes = require("../routes/submitReportsQuickly.route");
const newScriptsCompatRoute = require("./newScriptsCompat.route");

const buildVersion = require("../../../build-version.json");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/system", systemRoutes);
router.use("/updates", updateRoutes);
router.use("/companes", companesRoutes);
router.use("/upload", uploadRoute);
router.use("/elrajhi-upload", elrajhiUploadRoute);
router.use("/new-scripts", newScriptsCompatRoute);
router.use("/submit-reports-quickly", submitReportsQuicklyRoutes);

router.get("/health", (req, res) =>
  res.json({ ok: true, version: buildVersion.build }),
);

module.exports = router;
