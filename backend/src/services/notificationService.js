// backend/src/services/notificationService.js
// Notification Service - Helper functions to create notifications
// This service can be called from any controller without modifying existing code

const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {String} params.userId - User ID to notify
 * @param {String} params.message - Notification message
 * @param {String} params.type - Notification type (login_success, request_approved, etc.)
 * @param {Object} params.relatedEntity - Optional related entity info
 * @param {Object} params.metadata - Optional additional metadata
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async ({ userId, message, type, relatedEntity = null, metadata = {} }) => {
    try {
        const notificationData = {
            userId,
            message,
            type,
            metadata
        };

        if (relatedEntity) {
            notificationData.relatedEntity = relatedEntity;
        }

        const notification = await Notification.create(notificationData);
        return notification;
    } catch (error) {
        // Log error but don't throw - notifications should not break main flow
        console.error('Error creating notification:', error.message);
        return null;
    }
};

/**
 * Create login success notification
 * @param {String} userId - User ID
 * @param {String} userName - User name for message
 */
const notifyLoginSuccess = async (userId, userName) => {
    return createNotification({
        userId,
        message: `Welcome back, ${userName}! You have successfully logged in.`,
        type: 'login_success',
        metadata: { loginTime: new Date() }
    });
};

/**
 * Create request approved notification
 * @param {String} userId - User ID (request creator)
 * @param {String} requestType - Type of request (leave, expense, task)
 * @param {String} requestId - Request ID
 * @param {String} approverName - Name of the approver
 */
const notifyRequestApproved = async (userId, requestType, requestId, approverName) => {
    return createNotification({
        userId,
        message: `Your ${requestType} request has been approved by ${approverName}.`,
        type: 'request_approved',
        relatedEntity: {
            entityType: 'request',
            entityId: requestId
        }
    });
};

/**
 * Create request rejected notification
 * @param {String} userId - User ID (request creator)
 * @param {String} requestType - Type of request (leave, expense, task)
 * @param {String} requestId - Request ID
 * @param {String} approverName - Name of the rejector
 * @param {String} reason - Rejection reason (optional)
 */
const notifyRequestRejected = async (userId, requestType, requestId, approverName, reason = '') => {
    let message = `Your ${requestType} request has been rejected by ${approverName}.`;
    if (reason) {
        message += ` Reason: ${reason}`;
    }

    return createNotification({
        userId,
        message,
        type: 'request_rejected',
        relatedEntity: {
            entityType: 'request',
            entityId: requestId
        },
        metadata: { rejectionReason: reason }
    });
};

/**
 * Create role changed notification
 * @param {String} userId - User ID whose role changed
 * @param {String} oldRole - Previous role
 * @param {String} newRole - New role
 * @param {String} changedByName - Name of user who made the change
 */
const notifyRoleChanged = async (userId, oldRole, newRole, changedByName) => {
    return createNotification({
        userId,
        message: `Your role has been changed from ${oldRole} to ${newRole} by ${changedByName}.`,
        type: 'role_changed',
        metadata: {
            oldRole,
            newRole,
            changedAt: new Date()
        }
    });
};

/**
 * Create task assigned notification
 * @param {String} userId - User ID (assignee)
 * @param {String} taskTitle - Task title
 * @param {String} taskId - Task ID
 * @param {String} assignerName - Name of the assigner
 */
const notifyTaskAssigned = async (userId, taskTitle, taskId, assignerName) => {
    return createNotification({
        userId,
        message: `New task "${taskTitle}" has been assigned to you by ${assignerName}.`,
        type: 'task_assigned',
        relatedEntity: {
            entityType: 'task',
            entityId: taskId
        }
    });
};

/**
 * Get user notifications with pagination
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @param {Number} options.page - Page number (default 1)
 * @param {Number} options.limit - Items per page (default 20)
 * @param {Boolean} options.unreadOnly - Only return unread notifications
 * @returns {Promise<Object>} Notifications with pagination info
 */
const getUserNotifications = async (userId, options = {}) => {
    const { page = 1, limit = 20, unreadOnly = false } = options;

    const query = { userId };
    if (unreadOnly) {
        query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Notification.countDocuments(query)
    ]);

    return {
        notifications,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID (for authorization)
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
    );
    return notification;
};

/**
 * Mark all notifications as read for a user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Update result
 */
const markAllAsRead = async (userId) => {
    const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
    );
    return result;
};

/**
 * Get unread notification count for a user
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
const getUnreadCount = async (userId) => {
    return Notification.countDocuments({ userId, isRead: false });
};

module.exports = {
    createNotification,
    notifyLoginSuccess,
    notifyRequestApproved,
    notifyRequestRejected,
    notifyRoleChanged,
    notifyTaskAssigned,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};
