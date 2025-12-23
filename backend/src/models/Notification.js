// backend/src/models/Notification.js
// Notification System - Database-only notifications
// Events: Login success, Request approved, Request rejected, Role changed

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // User who receives this notification
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Notification message
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    // Type of notification for categorization and filtering
    type: {
        type: String,
        enum: [
            'login_success',      // User logged in successfully
            'request_approved',   // Leave/expense/task request approved
            'request_rejected',   // Leave/expense/task request rejected
            'role_changed',       // User's role was changed
            'task_assigned',      // New task assigned (bonus notification)
            'task_completed',     // Task was marked complete
            'system'              // System notifications
        ],
        required: true
    },
    // Read status
    isRead: {
        type: Boolean,
        default: false
    },
    // Optional: Reference to related entity (request, task, etc.)
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['request', 'task', 'user', null]
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    // Optional: Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for efficient user notification queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Index for type-based filtering
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// TTL index to auto-delete old notifications after 90 days (optional)
// Uncomment if you want automatic cleanup:
// notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
