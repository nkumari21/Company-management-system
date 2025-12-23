// backend/src/routes/userManagementRoutes.js
// Enhanced User Management Routes
// Provides role change with audit logging - use this instead of PUT /api/users/:id for role changes

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const userManagementController = require('../controllers/userManagementController');

// All routes require authentication
router.use(protect);

// @route   GET /api/user-management/eligible-for-role-change
// @desc    Get users eligible for role change (Founder, Co-Founder only)
// @access  Private
router.get('/eligible-for-role-change', userManagementController.getEligibleUsers);

// @route   POST /api/user-management/change-role/:id
// @desc    Change user role with automatic audit logging (Founder, Co-Founder only)
// @access  Private
router.post('/change-role/:id', userManagementController.changeUserRole);

module.exports = router;
