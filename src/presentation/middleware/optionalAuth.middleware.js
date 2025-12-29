const { verifyToken } = require('../../application/services/user/jwt.service');

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.userId = null;
        return next();
    }

    const token = authHeader.substring(7);

    try {
        const decoded = verifyToken(token);
        req.userId = decoded.id;
    } catch (error) {
        req.userId = null;
    }

    next();
};

module.exports = optionalAuth;
