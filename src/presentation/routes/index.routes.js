const express = require('express');
const reportRoutes = require('./report.routes');
const packageRoutes = require('./package.routes');
const userRoutes = require('./user.routes');
const uploadRoute = require("../routes/upload.route");


const router = express.Router();

router.use('/report', reportRoutes);
router.use('/packages', packageRoutes);
router.use('/users', userRoutes);
router.use("/upload", uploadRoute);

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
