const bcrypt = require('bcryptjs');

/**
 * Hash password
 */
exports.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 */
exports.comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};