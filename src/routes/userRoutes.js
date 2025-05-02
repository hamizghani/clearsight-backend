const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  [
    body('hospitalName')
      .optional()
      .not()
      .isEmpty()
      .withMessage('Hospital name cannot be empty'),
    body('adminName')
      .optional()
      .not()
      .isEmpty()
      .withMessage('Administrator name cannot be empty'),
    body('phoneNumber')
      .optional()
      .not()
      .isEmpty()
      .withMessage('Phone number cannot be empty'),
    body('hospitalAddress')
      .optional()
      .not()
      .isEmpty()
      .withMessage('Hospital address cannot be empty')
  ],
  userController.updateProfile
);

/**
 * @route   GET /api/users/credits
 * @desc    Get user credits
 * @access  Private
 */
router.get('/credits', userController.getCredits);

module.exports = router;