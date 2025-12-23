// backend/src/services/integrationHooks.js
// Integration Hooks for New Features
// These functions safely hook into existing flows without modifying original code
// Call these functions from new code or add as middleware

const { notifyLoginSuccess, notifyTaskAssigned } = require('./notificationService');
const { onTaskCompleted, onLateLogin } = require('./performanceService');
const { logRoleChange } = require('./roleChangeService');
const User = require('../models/User');

/**
 * INTEGRATION POINTS DOCUMENTATION
 * ================================
 *
 * 1. LOGIN SUCCESS NOTIFICATION
 *    - Option A: Call notifyLoginSuccess(userId, userName) after login
 *    - Option B: Use loginSuccessHook middleware on /api/auth/login
 *    - Option C: Frontend calls POST /api/notifications/trigger/login after login
 *
 * 2. TASK COMPLETION PERFORMANCE UPDATE
 *    - Option A: Call onTaskCompleted(employeeId, taskId) when task status becomes 'completed'
 *    - Option B: Use Mongoose post-save hook on Task model (requires model modification)
 *    - Option C: Use POST /api/performance/trigger/task-complete endpoint
 *
 * 3. LATE LOGIN PERFORMANCE PENALTY
 *    - Option A: Call onLateLogin(employeeId, loginTime) after attendance is recorded
 *    - Option B: Use POST /api/performance/trigger/check-late-login endpoint
 *
 * 4. ROLE CHANGE AUDIT LOG
 *    - Option A: Use POST /api/users/:id/change-role instead of PUT /api/users/:id
 *    - Option B: Call logRoleChange() after role update
 */

/**
 * Hook to call after a successful login
 * Creates login notification and checks for late login
 * @param {String} userId - User ID
 * @param {String} userName - User name
 * @param {Date} loginTime - Login timestamp
 * @param {String} department - User department (for performance tracking)
 */
const afterLoginHook = async (userId, userName, loginTime = new Date(), department = null) => {
    try {
        // Create login success notification
        await notifyLoginSuccess(userId, userName);

        // Check for late login and update performance if applicable
        if (department) {
            await onLateLogin(userId, loginTime);
        }

        console.log(`[Hook] Login hooks executed for user ${userId}`);
    } catch (error) {
        // Hooks should not break main flow
        console.error('[Hook] Error in afterLoginHook:', error.message);
    }
};

/**
 * Hook to call after a task is completed
 * Updates performance score
 * @param {String} taskId - Task ID
 * @param {String} employeeId - Employee ID who completed the task
 */
const afterTaskCompletedHook = async (taskId, employeeId) => {
    try {
        await onTaskCompleted(employeeId, taskId);
        console.log(`[Hook] Task completion hooks executed for task ${taskId}`);
    } catch (error) {
        console.error('[Hook] Error in afterTaskCompletedHook:', error.message);
    }
};

/**
 * Hook to call after a role change
 * Creates audit log and notification
 * @param {Object} params - Role change parameters
 * @param {String} params.changedUserId - User whose role was changed
 * @param {String} params.oldRole - Previous role
 * @param {String} params.newRole - New role
 * @param {String} params.changedBy - User ID who made the change
 * @param {String} params.changedByName - Name of user who made the change
 * @param {Object} params.userSnapshot - Snapshot of user details
 * @param {String} params.reason - Reason for change
 */
const afterRoleChangeHook = async (params) => {
    try {
        await logRoleChange(params);
        console.log(`[Hook] Role change hooks executed for user ${params.changedUserId}`);
    } catch (error) {
        console.error('[Hook] Error in afterRoleChangeHook:', error.message);
    }
};

/**
 * Hook to call after a new task is assigned
 * Creates task assignment notification
 * @param {String} taskId - Task ID
 * @param {String} taskTitle - Task title
 * @param {String} assigneeId - Assignee user ID
 * @param {String} assignerName - Name of user who assigned the task
 */
const afterTaskAssignedHook = async (taskId, taskTitle, assigneeId, assignerName) => {
    try {
        await notifyTaskAssigned(assigneeId, taskTitle, taskId, assignerName);
        console.log(`[Hook] Task assignment notification created for user ${assigneeId}`);
    } catch (error) {
        console.error('[Hook] Error in afterTaskAssignedHook:', error.message);
    }
};

module.exports = {
    afterLoginHook,
    afterTaskCompletedHook,
    afterRoleChangeHook,
    afterTaskAssignedHook
};
