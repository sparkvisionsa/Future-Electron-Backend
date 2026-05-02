const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

/**
 * Default: no expiry (session lasts until explicit logout or JWT_SECRET rotation).
 * To restore time-limited tokens, set e.g. JWT_EXPIRES_IN=24h and REFRESH_TOKEN_EXPIRES_IN=30d
 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;

function generateAccessToken(userPayload) {
  const ttl = JWT_EXPIRES_IN != null ? String(JWT_EXPIRES_IN).trim() : '';
  if (ttl) {
    return jwt.sign(userPayload, JWT_SECRET, { expiresIn: ttl });
  }
  return jwt.sign(userPayload, JWT_SECRET);
}

function generateRefreshToken(userPayload) {
  const ttl =
    REFRESH_TOKEN_EXPIRES_IN != null
      ? String(REFRESH_TOKEN_EXPIRES_IN).trim()
      : '';
  if (ttl) {
    return jwt.sign(userPayload, JWT_SECRET, { expiresIn: ttl });
  }
  return jwt.sign(userPayload, JWT_SECRET);
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken
};