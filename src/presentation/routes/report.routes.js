const express = require('express');
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../../application/middleware/authMiddleware')

const router = express.Router();


router.get('/reportExistenceCheck/:reportId', reportController.reportExistenceCheck);
router.get('/checkMissingPages/:reportId', reportController.checkMissingPages);
router.get('/getAllReports', reportController.getAllReports);

router.post('/createReport', reportController.createReport);
router.post('/createReportWithCommonFields', reportController.createReportWithCommonFields);
router.put('/addCommonFields', reportController.addCommonFields);

module.exports = router;
