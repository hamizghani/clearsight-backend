const { validationResult } = require('express-validator');
const authService = require('../services/authService');

/**
 * Register a new user
 */
exports.signup = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      email, 
      password, 
      hospitalName, 
      adminName, 
      phoneNumber, 
      hospitalAddress 
    } = req.body;

    // Call service to register user
    const result = await authService.registerUser({
      email,
      password,
      hospitalName,
      adminName,
      phoneNumber,
      hospitalAddress
    });

    return res.status(201).json({
      message: 'User registered successfully',
      userId: result.userId,
      token: result.token
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Email already in use'
      });
    }
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Call service to login user
    const result = await authService.loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      userId: result.userId,
      token: result.token
    });
  } catch (error) {
    next(error);
  }
};