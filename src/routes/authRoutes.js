const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('hospitalName')
      .not()
      .isEmpty()
      .withMessage('Hospital name is required'),
    body('adminName')
      .not()
      .isEmpty()
      .withMessage('Administrator name is required'),
    body('phoneNumber')
      .not()
      .isEmpty()
      .withMessage('Phone number is required'),
    body('hospitalAddress')
      .not()
      .isEmpty()
      .withMessage('Hospital address is required')
  ],
  authController.signup
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .not()
      .isEmpty()
      .withMessage('Password is required')
  ],
  authController.login
);

module.exports = router;