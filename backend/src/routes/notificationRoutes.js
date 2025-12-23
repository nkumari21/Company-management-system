// backend/src/routes/notificationRoutes.js
// Notification System Routes
// Endpoints for viewing and managing notifications

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', notificationController.getUnreadCount);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', notificationController.markAllAsRead);

// @route   DELETE /api/notifications/clear-read
// @desc    Delete all read notifications
// @access  Private
router.delete('/clear-read', notificationController.clearReadNotifications);

// @route   GET /api/notifications/type/:type
// @desc    Get notifications by type
// @access  Private
router.get('/type/:type', notificationController.getNotificationsByType);

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', notificationController.getNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', notificationController.markAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
