// backend/src/controllers/performanceController.js
// Performance Score / KPI Controller
// Accessible to Admin / Founder / Department Heads

const Performance = require('../models/Performance');
const { getDepartmentFromRole } = require('../middleware/rbac');
const performanceService = require('../services/performanceService');

// @desc    Get monthly performance report
// @route   GET /api/performance
// @access  Private (Admin, Founder, Co-Founder, Department Heads)
exports.getPerformanceReport = async (req, res) => {
    try {
        const user = req.user;
        const { month, year } = req.query;

        // Validate month and year
        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();

        if (reportMonth < 1 || reportMonth > 12) {
            return res.status(400).json({
                success: false,
                message: 'Month must be between 1 and 12'
            });
        }

        // Employees cannot access performance reports
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees are not authorized to view performance reports'
            });
        }

        let performances;

        // Founder and Co-founder can see all performance data
        if (user.role === 'founder' || user.role === 'co-founder') {
            performances = await performanceService.getAllPerformance(reportMonth, reportYear);
        }
        // Department heads can only see their department's performance
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            performances = await performanceService.getDepartmentPerformance(department, reportMonth, reportYear);
        }

        res.status(200).json({
            success: true,
            month: reportMonth,
            year: reportYear,
            count: performances.length,
            data: performances
        });
    } catch (error) {
        console.error('Get performance report error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get performance for a specific employee
// @route   GET /api/performance/employee/:id
// @access  Private (Admin, Founder, Co-Founder, Department Heads, Self)
exports.getEmployeePerformance = async (req, res) => {
    try {
        const user = req.user;
        const employeeId = req.params.id;
        const { month, year } = req.query;

        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();

        // Employees can only see their own performance
        if (user.role === 'employee' && user._id.toString() !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Employees can only view their own performance'
            });
        }

        // Department heads can only see their department's employees
        if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            const performance = await performanceService.getEmployeePerformance(employeeId, reportMonth, reportYear);

            if (performance && performance.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view performance from other departments'
                });
            }
        }

        const performance = await performanceService.getEmployeePerformance(employeeId, reportMonth, reportYear);

        if (!performance) {
            return res.status(404).json({
                success: false,
                message: 'Performance record not found for this period'
            });
        }

        res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get my performance (current user)
// @route   GET /api/performance/my-performance
// @access  Private
exports.getMyPerformance = async (req, res) => {
    try {
        const user = req.user;
        const { month, year } = req.query;

        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();

        const performance = await performanceService.getEmployeePerformance(user._id, reportMonth, reportYear);

        // Return empty record if no performance data exists
        if (!performance) {
            return res.status(200).json({
                success: true,
                data: {
                    employeeId: user._id,
                    totalScore: 0,
                    tasksCompleted: 0,
                    lateLogins: 0,
                    approvedLeaves: 0,
                    month: reportMonth,
                    year: reportYear,
                    scoreBreakdown: {
                        taskPoints: 0,
                        lateLoginPenalty: 0
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get performance leaderboard
// @route   GET /api/performance/leaderboard
// @access  Private (Admin, Founder, Co-Founder, Department Heads)
exports.getLeaderboard = async (req, res) => {
    try {
        const user = req.user;
        const { month, year, limit } = req.query;

        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();
        const resultLimit = parseInt(limit) || 10;

        // Employees cannot access leaderboard
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees are not authorized to view leaderboard'
            });
        }

        let department = null;
        // Department heads can only see their department's leaderboard
        if (user.role.includes('_head')) {
            department = getDepartmentFromRole(user.role);
        }

        const leaderboard = await performanceService.getLeaderboard({
            month: reportMonth,
            year: reportYear,
            department,
            limit: resultLimit
        });

        res.status(200).json({
            success: true,
            month: reportMonth,
            year: reportYear,
            department: department || 'all',
            data: leaderboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get department performance summary
// @route   GET /api/performance/department/:department
// @access  Private (Admin, Founder, Co-Founder, Department Head of that department)
exports.getDepartmentPerformance = async (req, res) => {
    try {
        const user = req.user;
        const { department } = req.params;
        const { month, year } = req.query;

        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();

        // Employees cannot access department performance
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees are not authorized to view department performance'
            });
        }

        // Department heads can only see their own department
        if (user.role.includes('_head')) {
            const userDepartment = getDepartmentFromRole(user.role);
            if (department !== userDepartment) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view performance from other departments'
                });
            }
        }

        const performances = await performanceService.getDepartmentPerformance(department, reportMonth, reportYear);

        // Calculate department summary
        const summary = {
            department,
            month: reportMonth,
            year: reportYear,
            totalEmployees: performances.length,
            averageScore: 0,
            totalTasksCompleted: 0,
            totalLateLogins: 0,
            topPerformer: null
        };

        if (performances.length > 0) {
            const totalScore = performances.reduce((sum, p) => sum + p.totalScore, 0);
            summary.averageScore = Math.round(totalScore / performances.length);
            summary.totalTasksCompleted = performances.reduce((sum, p) => sum + p.tasksCompleted, 0);
            summary.totalLateLogins = performances.reduce((sum, p) => sum + p.lateLogins, 0);
            summary.topPerformer = performances[0]; // Already sorted by score
        }

        res.status(200).json({
            success: true,
            summary,
            employees: performances
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Manually trigger performance recalculation for an employee
// @route   POST /api/performance/recalculate/:employeeId
// @access  Private (Founder, Co-Founder only)
exports.recalculatePerformance = async (req, res) => {
    try {
        const user = req.user;
        const { employeeId } = req.params;
        const { month, year } = req.body;

        // Only founder and co-founder can trigger recalculation
        if (user.role !== 'founder' && user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can recalculate performance'
            });
        }

        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();

        // Recalculate from attendance data
        const attendanceStats = await performanceService.recalculateFromAttendance(employeeId, reportMonth, reportYear);

        res.status(200).json({
            success: true,
            message: 'Performance recalculation data retrieved',
            data: attendanceStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
