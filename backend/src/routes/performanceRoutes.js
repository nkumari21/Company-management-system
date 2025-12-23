// backend/src/routes/performanceRoutes.js
// Performance Score / KPI System Routes
// Endpoints for viewing performance reports and leaderboards

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const performanceController = require('../controllers/performanceController');

// All routes require authentication
router.use(protect);

// @route   GET /api/performance/my-performance
// @desc    Get logged-in user's performance
// @access  Private
router.get('/my-performance', performanceController.getMyPerformance);

// @route   GET /api/performance/leaderboard
// @desc    Get performance leaderboard (Admin, Founder, Co-Founder, Department Heads)
// @access  Private
router.get('/leaderboard', performanceController.getLeaderboard);

// @route   GET /api/performance/department/:department
// @desc    Get department performance summary
// @access  Private (Admin, Founder, Co-Founder, Department Head of that department)
router.get('/department/:department', performanceController.getDepartmentPerformance);

// @route   GET /api/performance/employee/:id
// @desc    Get performance for a specific employee
// @access  Private (Admin, Founder, Co-Founder, Department Heads, Self)
router.get('/employee/:id', performanceController.getEmployeePerformance);

// @route   POST /api/performance/recalculate/:employeeId
// @desc    Manually trigger performance recalculation (Founder, Co-Founder only)
// @access  Private
router.post('/recalculate/:employeeId', performanceController.recalculatePerformance);

// @route   GET /api/performance
// @desc    Get monthly performance report (Admin, Founder, Co-Founder, Department Heads)
// @access  Private
router.get('/', performanceController.getPerformanceReport);

module.exports = router;
