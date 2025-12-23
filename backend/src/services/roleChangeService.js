// backend/src/services/roleChangeService.js
// Role Change Audit Log Service
// Tracks: Who changed role, when, old role → new role
// This service creates audit logs without modifying existing role-change logic

const RoleChangeLog = require('../models/RoleChangeLog');
const { notifyRoleChanged } = require('./notificationService');

/**
 * Create a role change audit log entry
 * Should be called whenever a user's role is changed
 * @param {Object} params - Role change parameters
 * @param {String} params.changedUserId - ID of user whose role was changed
 * @param {String} params.oldRole - Previous role
 * @param {String} params.newRole - New role
 * @param {String} params.changedBy - ID of user who made the change
 * @param {String} params.changedByName - Name of user who made the change (for notification)
 * @param {String} params.reason - Optional reason for the change
 * @param {Object} params.userSnapshot - Snapshot of user details
 * @param {Object} params.auditInfo - Optional IP/UserAgent info
 * @returns {Promise<Object>} Created log entry
 */
const logRoleChange = async ({
    changedUserId,
    oldRole,
    newRole,
    changedBy,
    changedByName = 'Administrator',
    reason = '',
    userSnapshot = {},
    auditInfo = {}
}) => {
    try {
        // Don't log if role hasn't actually changed
        if (oldRole === newRole) {
            return null;
        }

        const logEntry = await RoleChangeLog.create({
            changedUserId,
            oldRole,
            newRole,
            changedBy,
            changedAt: new Date(),
            reason,
            userSnapshot,
            auditInfo
        });

        // Create notification for the user whose role was changed
        await notifyRoleChanged(changedUserId, oldRole, newRole, changedByName);

        console.log(`Role change logged: User ${changedUserId} changed from ${oldRole} to ${newRole} by ${changedBy}`);
        return logEntry;
    } catch (error) {
        console.error('Error logging role change:', error.message);
        // Don't throw - logging should not break main flow
        return null;
    }
};

/**
 * Get role change history for a specific user
 * @param {String} userId - User ID to get history for
 * @param {Object} options - Query options
 * @param {Number} options.page - Page number (default 1)
 * @param {Number} options.limit - Items per page (default 20)
 * @returns {Promise<Object>} Role change logs with pagination
 */
const getUserRoleHistory = async (userId, options = {}) => {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        RoleChangeLog.find({ changedUserId: userId })
            .populate('changedBy', 'name email role')
            .populate('changedUserId', 'name email')
            .sort({ changedAt: -1 })
            .skip(skip)
            .limit(limit),
        RoleChangeLog.countDocuments({ changedUserId: userId })
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get all role changes made by a specific admin/founder
 * @param {String} adminId - Admin user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Role change logs with pagination
 */
const getChangesByAdmin = async (adminId, options = {}) => {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        RoleChangeLog.find({ changedBy: adminId })
            .populate('changedBy', 'name email role')
            .populate('changedUserId', 'name email')
            .sort({ changedAt: -1 })
            .skip(skip)
            .limit(limit),
        RoleChangeLog.countDocuments({ changedBy: adminId })
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get all role change logs with optional filters
 * @param {Object} filters - Query filters
 * @param {Date} filters.startDate - Start date filter
 * @param {Date} filters.endDate - End date filter
 * @param {String} filters.oldRole - Filter by old role
 * @param {String} filters.newRole - Filter by new role
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Role change logs with pagination
 */
const getAllRoleChanges = async (filters = {}, options = {}) => {
    const { page = 1, limit = 20 } = options;
    const { startDate, endDate, oldRole, newRole } = filters;
    const skip = (page - 1) * limit;

    const query = {};

    if (startDate || endDate) {
        query.changedAt = {};
        if (startDate) query.changedAt.$gte = new Date(startDate);
        if (endDate) query.changedAt.$lte = new Date(endDate);
    }

    if (oldRole) query.oldRole = oldRole;
    if (newRole) query.newRole = newRole;

    const [logs, total] = await Promise.all([
        RoleChangeLog.find(query)
            .populate('changedBy', 'name email role')
            .populate('changedUserId', 'name email department')
            .sort({ changedAt: -1 })
            .skip(skip)
            .limit(limit),
        RoleChangeLog.countDocuments(query)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get role change statistics
 * @param {Object} filters - Date range filters
 * @returns {Promise<Object>} Statistics
 */
const getRoleChangeStats = async (filters = {}) => {
    const { startDate, endDate } = filters;

    const matchQuery = {};
    if (startDate || endDate) {
        matchQuery.changedAt = {};
        if (startDate) matchQuery.changedAt.$gte = new Date(startDate);
        if (endDate) matchQuery.changedAt.$lte = new Date(endDate);
    }

    const stats = await RoleChangeLog.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalChanges: { $sum: 1 },
                promotions: {
                    $sum: {
                        $cond: [
                            { $in: ['$newRole', ['founder', 'co-founder', 'technical_head', 'sales_head', 'finance_head']] },
                            1, 0
                        ]
                    }
                },
                byOldRole: { $push: '$oldRole' },
                byNewRole: { $push: '$newRole' }
            }
        }
    ]);

    return stats[0] || { totalChanges: 0, promotions: 0 };
};

module.exports = {
    logRoleChange,
    getUserRoleHistory,
    getChangesByAdmin,
    getAllRoleChanges,
    getRoleChangeStats
};
