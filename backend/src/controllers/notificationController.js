// backend/src/controllers/notificationController.js
// Notification System Controller
// APIs for users to view and manage their notifications

const notificationService = require('../services/notificationService');

// @desc    Get my notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const user = req.user;
        const { page, limit, unreadOnly, type } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            unreadOnly: unreadOnly === 'true'
        };

        const result = await notificationService.getUserNotifications(user._id, options);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
    try {
        const user = req.user;
        const count = await notificationService.getUnreadCount(user._id);

        res.status(200).json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const user = req.user;
        const notificationId = req.params.id;

        const notification = await notificationService.markAsRead(notificationId, user._id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or not authorized'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        const user = req.user;
        const result = await notificationService.markAllAsRead(user._id);

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notifications marked as read`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get notifications by type
// @route   GET /api/notifications/type/:type
// @access  Private
exports.getNotificationsByType = async (req, res) => {
    try {
        const user = req.user;
        const { type } = req.params;
        const { page, limit } = req.query;

        const Notification = require('../models/Notification');

        const validTypes = [
            'login_success',
            'request_approved',
            'request_rejected',
            'role_changed',
            'task_assigned',
            'task_completed',
            'system'
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;
        const skip = (pageNum - 1) * limitNum;

        const [notifications, total] = await Promise.all([
            Notification.find({ userId: user._id, type })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Notification.countDocuments({ userId: user._id, type })
        ]);

        res.status(200).json({
            success: true,
            notifications,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        const user = req.user;
        const notificationId = req.params.id;
        const Notification = require('../models/Notification');

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            userId: user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or not authorized'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
exports.clearReadNotifications = async (req, res) => {
    try {
        const user = req.user;
        const Notification = require('../models/Notification');

        const result = await Notification.deleteMany({
            userId: user._id,
            isRead: true
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} read notifications deleted`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
