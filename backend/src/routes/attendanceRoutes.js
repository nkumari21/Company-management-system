// backend/src/routes/attendanceRoutes.js

const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');
const { getDepartmentFromRole } = require('../middleware/rbac');

// @desc    Get attendance records (filtered by role)
// @route   GET /api/attendance
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        // Founder and co-founder can see all attendance
        if (user.role === 'founder' || user.role === 'co-founder') {
            query = {};
        }
        // Department heads can ONLY see their department's attendance
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            query = { department: department };
        }
        // Employees can ONLY see their own attendance
        else if (user.role === 'employee') {
            query = { user: user._id };
        }

        const attendance = await Attendance.find(query)
            .populate('user', 'name email role department')
            .sort('-date');

        res.status(200).json({
            success: true,
            count: attendance.length,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get my attendance
// @route   GET /api/attendance/my-attendance
// @access  Private
router.get('/my-attendance', protect, async (req, res) => {
    try {
        const attendance = await Attendance.find({ user: req.user._id })
            .populate('user', 'name email role department')
            .sort('-date');

        res.status(200).json({
            success: true,
            count: attendance.length,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id)
            .populate('user', 'name email role department');

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const user = req.user;

        // Check access permissions
        if (user.role === 'employee') {
            if (attendance.user._id.toString() !== user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this record.'
                });
            }
        } else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            if (attendance.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
