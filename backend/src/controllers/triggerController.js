// backend/src/controllers/triggerController.js
// Trigger Controller for Integration Hooks
// Provides endpoints to trigger hooks for events that happen in existing code
// This allows integration without modifying existing controllers

const { afterLoginHook, afterTaskCompletedHook, afterTaskAssignedHook } = require('../services/integrationHooks');
const { onLateLogin, onTaskCompleted } = require('../services/performanceService');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');

// @desc    Trigger login hooks (notification + late login check)
// @route   POST /api/triggers/login
// @access  Private (called after login)
exports.triggerLoginHooks = async (req, res) => {
    try {
        const user = req.user;

        // Get today's attendance to check login time
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            user: user._id,
            date: today
        });

        const loginTime = attendance?.loginTime || new Date();

        // Execute login hooks
        await afterLoginHook(
            user._id,
            user.name,
            loginTime,
            user.department
        );

        res.status(200).json({
            success: true,
            message: 'Login hooks triggered successfully'
        });
    } catch (error) {
        // Don't fail - hooks are optional
        console.error('Trigger login hooks error:', error);
        res.status(200).json({
            success: true,
            message: 'Login hooks triggered with warnings',
            warning: error.message
        });
    }
};

// @desc    Trigger task completion hooks (performance update)
// @route   POST /api/triggers/task-complete/:taskId
// @access  Private (called after task is marked complete)
exports.triggerTaskCompleteHooks = async (req, res) => {
    try {
        const { taskId } = req.params;
        const user = req.user;

        // Find the task
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify task is completed
        if (task.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Task is not marked as completed'
            });
        }

        // Verify user is the assignee or has permission
        if (task.assignedTo.toString() !== user._id.toString() &&
            user.role !== 'founder' &&
            user.role !== 'co-founder' &&
            !user.role.includes('_head')) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to trigger hooks for this task'
            });
        }

        // Execute task completion hooks
        await afterTaskCompletedHook(taskId, task.assignedTo);

        res.status(200).json({
            success: true,
            message: 'Task completion hooks triggered successfully'
        });
    } catch (error) {
        console.error('Trigger task complete hooks error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Trigger task assignment notification
// @route   POST /api/triggers/task-assigned/:taskId
// @access  Private (called after task is created)
exports.triggerTaskAssignedHooks = async (req, res) => {
    try {
        const { taskId } = req.params;
        const user = req.user;

        // Find the task
        const task = await Task.findById(taskId).populate('assignedTo', 'name email');
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Verify user is the assigner or has permission
        if (task.assignedBy.toString() !== user._id.toString() &&
            user.role !== 'founder' &&
            user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to trigger hooks for this task'
            });
        }

        // Execute task assignment hooks
        await afterTaskAssignedHook(
            taskId,
            task.title,
            task.assignedTo._id,
            user.name
        );

        res.status(200).json({
            success: true,
            message: 'Task assignment hooks triggered successfully'
        });
    } catch (error) {
        console.error('Trigger task assigned hooks error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Check and update late login for current user
// @route   POST /api/triggers/check-late-login
// @access  Private
exports.triggerLateLoginCheck = async (req, res) => {
    try {
        const user = req.user;

        if (!user.department) {
            return res.status(400).json({
                success: false,
                message: 'User has no department assigned'
            });
        }

        // Get today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            user: user._id,
            date: today
        });

        if (!attendance || !attendance.loginTime) {
            return res.status(400).json({
                success: false,
                message: 'No login record found for today'
            });
        }

        // Check for late login
        const result = await onLateLogin(user._id, attendance.loginTime);

        if (result) {
            res.status(200).json({
                success: true,
                message: 'Late login detected and performance updated',
                isLate: true
            });
        } else {
            res.status(200).json({
                success: true,
                message: 'Login time is within acceptable range',
                isLate: false
            });
        }
    } catch (error) {
        console.error('Trigger late login check error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Bulk trigger task completion hooks (for admin use)
// @route   POST /api/triggers/bulk-task-complete
// @access  Private (Founder, Co-Founder only)
exports.triggerBulkTaskComplete = async (req, res) => {
    try {
        const user = req.user;
        const { taskIds } = req.body;

        // Only founder and co-founder can trigger bulk operations
        if (user.role !== 'founder' && user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can trigger bulk operations'
            });
        }

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'taskIds array is required'
            });
        }

        const results = {
            success: [],
            failed: []
        };

        for (const taskId of taskIds) {
            try {
                const task = await Task.findById(taskId);
                if (task && task.status === 'completed') {
                    await onTaskCompleted(task.assignedTo, taskId);
                    results.success.push(taskId);
                } else {
                    results.failed.push({ taskId, reason: 'Task not found or not completed' });
                }
            } catch (error) {
                results.failed.push({ taskId, reason: error.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Processed ${results.success.length} tasks, ${results.failed.length} failed`,
            results
        });
    } catch (error) {
        console.error('Trigger bulk task complete error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
