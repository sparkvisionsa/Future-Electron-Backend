/**
 * Single local “guest” account in Mongo: one User doc with this phone.
 * Taqeem username + companies attach to this user; companes rows use user ref.
 */
const CANONICAL_GUEST_PHONE = String(
  process.env.CANONICAL_GUEST_PHONE || "000",
).trim();

const isCanonicalGuestPhone = (phone) => {
  if (phone === undefined || phone === null) return false;
  return String(phone).trim() === CANONICAL_GUEST_PHONE;
};

module.exports = {
  CANONICAL_GUEST_PHONE,
  isCanonicalGuestPhone,
};
