const express = require('express');

const userController = require('../controllers/user.controller');
const uploadStatsController = require('../controllers/uploadStats.controller');
const authMiddleware = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth.middleware');
const profileUpload = require('../../utils/profileUpload.multer');

const router = express.Router();

router.post('/register', optionalAuth, userController.register);
router.post('/login', optionalAuth, userController.login);

router.post('/guest', optionalAuth, userController.guestBootstrap);
router.post('/bootstrap', optionalAuth, userController.taqeemBootstrap);
router.post('/new-bootstrap', optionalAuth, userController.newTaqeemBootstrap);

router.get('/upload-stats', authMiddleware, uploadStatsController.listUploadStats);
router.post('/upload-stats/record', authMiddleware, uploadStatsController.recordUploadStat);
router.delete('/upload-stats', authMiddleware, uploadStatsController.clearUploadStats);

router.post('/authorize', authMiddleware, userController.authorizeTaqeem);
router.post('/profile-image', authMiddleware, profileUpload.single('profileImage'), userController.uploadProfileImage);
router.post('/taqeem/sync', authMiddleware, userController.syncTaqeemSnapshot);
router.post('/taqeem/default-company', authMiddleware, userController.setDefaultTaqeemCompany);
router.patch('/workspace-preferences', authMiddleware, userController.patchWorkspacePreferences);

module.exports = router;
