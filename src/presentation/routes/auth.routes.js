const express = require('express');
const { register, login, taqeemBootstrap, authorizeTaqeem } = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.post('/bootstrap', taqeemBootstrap);
router.post('/taqeem/authorize', authMiddleware, authorizeTaqeem);

module.exports = router;