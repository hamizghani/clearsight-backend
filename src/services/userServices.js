const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get user by ID
 */
exports.getUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId }
  });
};

/**
 * Update user profile
 */
exports.updateUser = async (userId, userData) => {
  return await prisma.user.update({
    where: { id: userId },
    data: userData
  });
};

/**
 * Get user credits
 */
exports.getUserCredits = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true }
  });
  
  return user ? user.credits : 0;
};

/**
 * Add credits to user
 */
exports.addCredits = async (userId, amount) => {
  // Start a transaction
  return await prisma.$transaction(async (prisma) => {
    // Update user credits
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount
        }
      }
    });
    
    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        amount,
        type: 'credit_purchase',
        description: `Added ${amount} credits`
      }
    });
    
    return updatedUser.credits;
  });
};

/**
 * Use credits
 */
exports.useCredits = async (userId, amount, description) => {
  // Start a transaction
  return await prisma.$transaction(async (prisma) => {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Check if user has enough credits
    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Update user credits
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: amount
        }
      }
    });
    
    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        amount: -amount,
        type: 'scan_usage',
        description: description || `Used ${amount} credits`
      }
    });
    
    return updatedUser.credits;
  });
};