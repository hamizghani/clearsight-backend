const { validationResult } = require('express-validator');
const userService = require('../services/userService');

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive data
    const { passwordHash, ...userProfile } = user;
    
    res.status(200).json({
      user: userProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { hospitalName, adminName, phoneNumber, hospitalAddress } = req.body;
    
    const updatedUser = await userService.updateUser(userId, {
      hospitalName,
      adminName,
      phoneNumber,
      hospitalAddress
    });

    // Remove sensitive data
    const { passwordHash, ...userProfile } = updatedUser;
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: userProfile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user credits
 */
exports.getCredits = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const credits = await userService.getUserCredits(userId);
    
    res.status(200).json({
      credits
    });
  } catch (error) {
    next(error);
  }
};