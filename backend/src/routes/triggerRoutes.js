// backend/src/routes/triggerRoutes.js
// Trigger Routes for Integration Hooks
// These endpoints allow triggering hooks for events from existing code
// Call these after corresponding actions to enable new features

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const triggerController = require('../controllers/triggerController');

// All routes require authentication
router.use(protect);

// @route   POST /api/triggers/login
// @desc    Trigger login hooks (notification + late login check)
// @access  Private (call after successful login)
// Usage: After login, call this to create notification and check for late login
router.post('/login', triggerController.triggerLoginHooks);

// @route   POST /api/triggers/task-complete/:taskId
// @desc    Trigger task completion hooks (performance update)
// @access  Private (call after task is marked complete)
// Usage: After updating task status to 'completed', call this to update performance
router.post('/task-complete/:taskId', triggerController.triggerTaskCompleteHooks);

// @route   POST /api/triggers/task-assigned/:taskId
// @desc    Trigger task assignment notification
// @access  Private (call after task is created)
// Usage: After creating a new task, call this to notify the assignee
router.post('/task-assigned/:taskId', triggerController.triggerTaskAssignedHooks);

// @route   POST /api/triggers/check-late-login
// @desc    Check and update late login for current user
// @access  Private
// Usage: Call to check if today's login was late and update performance
router.post('/check-late-login', triggerController.triggerLateLoginCheck);

// @route   POST /api/triggers/bulk-task-complete
// @desc    Bulk trigger task completion hooks (Founder, Co-Founder only)
// @access  Private
// Usage: For admin operations to update performance for multiple completed tasks
router.post('/bulk-task-complete', triggerController.triggerBulkTaskComplete);

module.exports = router;
