// backend/src/routes/roleChangeRoutes.js
// Role Change Audit Log Routes
// Endpoints for viewing role change history

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const roleChangeLogController = require('../controllers/roleChangeLogController');

// All routes require authentication
router.use(protect);

// @route   GET /api/role-changes/my-history
// @desc    Get logged-in user's role change history
// @access  Private
router.get('/my-history', roleChangeLogController.getMyRoleHistory);

// @route   GET /api/role-changes/stats
// @desc    Get role change statistics (Founder, Co-Founder only)
// @access  Private
router.get('/stats', roleChangeLogController.getRoleChangeStats);

// @route   GET /api/role-changes/user/:userId
// @desc    Get role change history for a specific user
// @access  Private (Founder, Co-Founder, or Self)
router.get('/user/:userId', roleChangeLogController.getUserRoleHistory);

// @route   GET /api/role-changes/by-admin/:adminId
// @desc    Get role changes made by a specific admin (Founder only)
// @access  Private
router.get('/by-admin/:adminId', roleChangeLogController.getChangesByAdmin);

// @route   GET /api/role-changes
// @desc    Get all role change logs (Founder, Co-Founder only)
// @access  Private
router.get('/', roleChangeLogController.getRoleChangeLogs);

module.exports = router;
