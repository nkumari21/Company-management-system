// backend/src/services/performanceService.js
// Performance Score / KPI Service
// Rules: Task completed = +10 points, Late login = -5 points, Approved leave = no penalty
// This service provides functions to update performance scores without modifying existing code

const Performance = require('../models/Performance');
const User = require('../models/User');

// Constants for scoring
const POINTS = {
    TASK_COMPLETED: 10,    // +10 for each completed task
    LATE_LOGIN: -5         // -5 for each late login
};

// Default late login threshold (9:30 AM)
const LATE_LOGIN_THRESHOLD_HOUR = 9;
const LATE_LOGIN_THRESHOLD_MINUTE = 30;

/**
 * Get or create performance record for an employee for a given month/year
 * @param {String} employeeId - Employee ID
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @param {String} department - Department
 * @returns {Promise<Object>} Performance record
 */
const getOrCreatePerformance = async (employeeId, month, year, department) => {
    let performance = await Performance.findOne({ employeeId, month, year });

    if (!performance) {
        performance = await Performance.create({
            employeeId,
            month,
            year,
            department,
            totalScore: 0,
            tasksCompleted: 0,
            lateLogins: 0,
            approvedLeaves: 0,
            scoreBreakdown: {
                taskPoints: 0,
                lateLoginPenalty: 0
            }
        });
    }

    return performance;
};

/**
 * Update performance score when a task is completed
 * Called when task status changes to 'completed'
 * @param {String} employeeId - Employee ID who completed the task
 * @param {String} taskId - Task ID (for tracking)
 * @returns {Promise<Object>} Updated performance record
 */
const onTaskCompleted = async (employeeId, taskId) => {
    try {
        const user = await User.findById(employeeId);
        if (!user || !user.department) {
            console.error('Cannot update performance: User not found or has no department');
            return null;
        }

        const now = new Date();
        const month = now.getMonth() + 1; // JavaScript months are 0-indexed
        const year = now.getFullYear();

        const performance = await getOrCreatePerformance(employeeId, month, year, user.department);

        // Update task completion count and points
        performance.tasksCompleted += 1;
        performance.scoreBreakdown.taskPoints += POINTS.TASK_COMPLETED;
        performance.totalScore = performance.scoreBreakdown.taskPoints + performance.scoreBreakdown.lateLoginPenalty;

        await performance.save();

        console.log(`Performance updated for employee ${employeeId}: +${POINTS.TASK_COMPLETED} points (task completed)`);
        return performance;
    } catch (error) {
        console.error('Error updating performance on task completion:', error.message);
        return null;
    }
};

/**
 * Check if a login time is considered late
 * @param {Date} loginTime - Login timestamp
 * @param {Number} thresholdHour - Hour threshold (default 9)
 * @param {Number} thresholdMinute - Minute threshold (default 30)
 * @returns {Boolean} True if login is late
 */
const isLateLogin = (loginTime, thresholdHour = LATE_LOGIN_THRESHOLD_HOUR, thresholdMinute = LATE_LOGIN_THRESHOLD_MINUTE) => {
    const loginHour = loginTime.getHours();
    const loginMinute = loginTime.getMinutes();

    // Late if after threshold time (e.g., after 9:30 AM)
    if (loginHour > thresholdHour) {
        return true;
    }
    if (loginHour === thresholdHour && loginMinute > thresholdMinute) {
        return true;
    }
    return false;
};

/**
 * Update performance score when a late login is detected
 * Should be called after attendance is recorded
 * @param {String} employeeId - Employee ID
 * @param {Date} loginTime - Login timestamp
 * @returns {Promise<Object>} Updated performance record (or null if not late)
 */
const onLateLogin = async (employeeId, loginTime) => {
    try {
        // Check if login is late
        if (!isLateLogin(loginTime)) {
            return null; // Not late, no penalty
        }

        const user = await User.findById(employeeId);
        if (!user || !user.department) {
            console.error('Cannot update performance: User not found or has no department');
            return null;
        }

        const month = loginTime.getMonth() + 1;
        const year = loginTime.getFullYear();

        const performance = await getOrCreatePerformance(employeeId, month, year, user.department);

        // Update late login count and penalty
        performance.lateLogins += 1;
        performance.scoreBreakdown.lateLoginPenalty += POINTS.LATE_LOGIN; // Negative value
        performance.totalScore = performance.scoreBreakdown.taskPoints + performance.scoreBreakdown.lateLoginPenalty;

        await performance.save();

        console.log(`Performance updated for employee ${employeeId}: ${POINTS.LATE_LOGIN} points (late login)`);
        return performance;
    } catch (error) {
        console.error('Error updating performance on late login:', error.message);
        return null;
    }
};

/**
 * Track approved leave (no penalty, just for record keeping)
 * @param {String} employeeId - Employee ID
 * @returns {Promise<Object>} Updated performance record
 */
const onLeaveApproved = async (employeeId) => {
    try {
        const user = await User.findById(employeeId);
        if (!user || !user.department) {
            return null;
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const performance = await getOrCreatePerformance(employeeId, month, year, user.department);
        performance.approvedLeaves += 1;
        // No score change for approved leaves
        await performance.save();

        return performance;
    } catch (error) {
        console.error('Error updating performance on leave approval:', error.message);
        return null;
    }
};

/**
 * Get monthly performance report for an employee
 * @param {String} employeeId - Employee ID
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Object>} Performance report
 */
const getEmployeePerformance = async (employeeId, month, year) => {
    return Performance.findOne({ employeeId, month, year })
        .populate('employeeId', 'name email department role');
};

/**
 * Get department performance report
 * @param {String} department - Department name
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Array>} Array of performance records
 */
const getDepartmentPerformance = async (department, month, year) => {
    return Performance.find({ department, month, year })
        .populate('employeeId', 'name email department role')
        .sort({ totalScore: -1 });
};

/**
 * Get all performance records for a month/year (Admin/Founder only)
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Array>} Array of performance records
 */
const getAllPerformance = async (month, year) => {
    return Performance.find({ month, year })
        .populate('employeeId', 'name email department role')
        .sort({ totalScore: -1 });
};

/**
 * Get performance leaderboard
 * @param {Object} options - Query options
 * @param {Number} options.month - Month (1-12)
 * @param {Number} options.year - Year
 * @param {String} options.department - Department filter (optional)
 * @param {Number} options.limit - Limit results (default 10)
 * @returns {Promise<Array>} Leaderboard entries
 */
const getLeaderboard = async (options = {}) => {
    const { month, year, department, limit = 10 } = options;

    const query = { month, year };
    if (department) {
        query.department = department;
    }

    return Performance.find(query)
        .populate('employeeId', 'name email department role')
        .sort({ totalScore: -1 })
        .limit(limit);
};

/**
 * Recalculate performance from attendance data
 * This is a utility function to sync performance with existing attendance
 * @param {String} employeeId - Employee ID
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 */
const recalculateFromAttendance = async (employeeId, month, year) => {
    const Attendance = require('../models/Attendance');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const attendances = await Attendance.find({
        user: employeeId,
        date: { $gte: startDate, $lte: endDate },
        loginTime: { $exists: true }
    });

    let lateCount = 0;
    attendances.forEach(att => {
        if (att.loginTime && isLateLogin(att.loginTime)) {
            lateCount++;
        }
    });

    return { lateLogins: lateCount };
};

module.exports = {
    POINTS,
    getOrCreatePerformance,
    onTaskCompleted,
    onLateLogin,
    onLeaveApproved,
    isLateLogin,
    getEmployeePerformance,
    getDepartmentPerformance,
    getAllPerformance,
    getLeaderboard,
    recalculateFromAttendance
};
