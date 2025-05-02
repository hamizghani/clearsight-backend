const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

/**
 * Register a new user
 */
exports.registerUser = async (userData) => {
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(userData.password, salt);

  // Create user in database
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      passwordHash,
      hospitalName: userData.hospitalName,
      adminName: userData.adminName,
      phoneNumber: userData.phoneNumber,
      hospitalAddress: userData.hospitalAddress,
      credits: 0, // Start with 0 credits
      role: 'user'
    }
  });

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    userId: user.id,
    token
  };
};

/**
 * Login user
 */
exports.loginUser = async (email, password) => {
  // Find user in database
  const user = await prisma.user.findUnique({
    where: { email }
  });

  // If user not found or password doesn't match
  if (!user) {
    return { success: false };
  }

  // Compare passwords
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false };
  }

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return {
    success: true,
    userId: user.id,
    token
  };
};