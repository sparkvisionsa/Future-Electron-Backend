const express = require('express');
const packageController = require('../controllers/package.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/adminOnly.middleware');
const transferUpload = require('../../utils/transferUpload.multer');

const router = express.Router();

router.get('/', packageController.getAllPackages);
router.post('/', authMiddleware, packageController.addPackage); // Assuming auth for add
router.put('/:id', authMiddleware, packageController.updatePackage);
router.delete('/:id', authMiddleware, packageController.deletePackage);
router.post('/subscribe', authMiddleware, packageController.subscribeToPackage);
router.get('/subscriptions', authMiddleware, packageController.getUserSubscriptions);
router.post('/requests', authMiddleware, packageController.createPackageRequest);
router.get('/requests', authMiddleware, packageController.getPackageRequests);
router.post(
    '/requests/:id/upload',
    authMiddleware,
    transferUpload.single('transferImage'),
    packageController.uploadRequestTransferImage
);
router.patch(
    '/requests/:id/status',
    authMiddleware,
    adminOnly,
    packageController.updatePackageRequestStatus
);
router.post('/requests/:id/ack', authMiddleware, packageController.acknowledgePackageRequest);

module.exports = router;
