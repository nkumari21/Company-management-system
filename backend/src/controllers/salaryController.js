// backend/src/controllers/salaryController.js

const Salary = require('../models/Salary');
const User = require('../models/User');
const { getDepartmentFromRole, getRoleLevel, canAssignSalary } = require('../middleware/rbac');

// @desc    Get salaries (filtered by role-based access)
// @route   GET /api/salaries
// @access  Private
exports.getSalaries = async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        switch (user.role) {
            case 'founder':
                // Founder can see all salaries company-wide
                query = {};
                break;

            case 'co-founder':
                // Co-Founder can see all departments' salaries (except founder's)
                const founderUsers = await User.find({ role: 'founder' }).select('_id');
                const founderIds = founderUsers.map(u => u._id);
                query = { user: { $nin: founderIds } };
                break;

            case 'technical_head':
            case 'sales_head':
            case 'finance_head':
                // Department Head can see ONLY their department's salaries
                const department = getDepartmentFromRole(user.role);
                query = { department: department };
                break;

            case 'employee':
                // Employee can ONLY see their own salary
                query = { user: user._id };
                break;

            default:
                return res.status(403).json({
                    success: false,
                    message: 'Invalid role for salary access'
                });
        }

        const salaries = await Salary.find(query)
            .populate('user', 'name email role department')
            .sort('-year -month');

        res.status(200).json({
            success: true,
            count: salaries.length,
            data: salaries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get my salary (for employees)
// @route   GET /api/salaries/my-salary
// @access  Private
exports.getMySalary = async (req, res) => {
    try {
        const salaries = await Salary.find({ user: req.user._id })
            .populate('user', 'name email role department')
            .sort('-year -month');

        res.status(200).json({
            success: true,
            count: salaries.length,
            data: salaries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single salary record
// @route   GET /api/salaries/:id
// @access  Private
exports.getSalary = async (req, res) => {
    try {
        const salary = await Salary.findById(req.params.id)
            .populate('user', 'name email role department');

        if (!salary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }

        const user = req.user;

        // Employee can only see their own salary
        if (user.role === 'employee') {
            if (salary.user._id.toString() !== user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this salary record'
                });
            }
        }
        // Department heads can only see their department's salaries
        else if (user.role.includes('_head')) {
            const userDepartment = getDepartmentFromRole(user.role);
            if (salary.department !== userDepartment) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
        }
        // Co-founder cannot see founder's salary
        else if (user.role === 'co-founder') {
            if (salary.user.role === 'founder') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view founder salary'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: salary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create salary record
// @route   POST /api/salaries
// @access  Private (Founder, Co-Founder only - to lower roles)
exports.createSalary = async (req, res) => {
    try {
        const user = req.user;

        // STRICT: Only founder and co-founder can create salary
        if (user.role !== 'founder' && user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can create salary records'
            });
        }

        const { userId, month, year, basicSalary, allowances, deductions } = req.body;

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // STRICT: Can only assign to LOWER roles
        const assignerLevel = getRoleLevel(user.role);
        const targetLevel = getRoleLevel(targetUser.role);
        
        if (assignerLevel <= targetLevel) {
            return res.status(403).json({
                success: false,
                message: 'Can only assign salary to lower role levels'
            });
        }

        // Check if salary already exists for this user/month/year
        const existingSalary = await Salary.findOne({ user: userId, month, year });
        if (existingSalary) {
            return res.status(400).json({
                success: false,
                message: 'Salary record already exists for this month/year'
            });
        }

        const netSalary = basicSalary + (allowances || 0) - (deductions || 0);

        const salary = await Salary.create({
            user: userId,
            month,
            year,
            basicSalary,
            allowances: allowances || 0,
            deductions: deductions || 0,
            netSalary,
            department: targetUser.department || 'management',
            status: 'pending'
        });

        const populatedSalary = await Salary.findById(salary._id)
            .populate('user', 'name email role department');

        res.status(201).json({
            success: true,
            data: populatedSalary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update salary record
// @route   PUT /api/salaries/:id
// @access  Private (Founder, Co-Founder only)
exports.updateSalary = async (req, res) => {
    try {
        const user = req.user;

        // Only founder and co-founder can update salary records
        if (user.role !== 'founder' && user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can update salary records'
            });
        }

        let salary = await Salary.findById(req.params.id).populate('user');

        if (!salary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }

        // Check role hierarchy - can only update salary of lower roles
        const assignerLevel = getRoleLevel(user.role);
        const targetLevel = getRoleLevel(salary.user.role);
        
        if (assignerLevel <= targetLevel) {
            return res.status(403).json({
                success: false,
                message: 'Can only update salary of lower role levels'
            });
        }

        const { basicSalary, allowances, deductions, status } = req.body;

        const updateData = { ...req.body };
        if (basicSalary !== undefined || allowances !== undefined || deductions !== undefined) {
            const newBasic = basicSalary !== undefined ? basicSalary : salary.basicSalary;
            const newAllowances = allowances !== undefined ? allowances : salary.allowances;
            const newDeductions = deductions !== undefined ? deductions : salary.deductions;
            updateData.netSalary = newBasic + newAllowances - newDeductions;
        }

        salary = await Salary.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        }).populate('user', 'name email role department');

        res.status(200).json({
            success: true,
            data: salary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete salary record
// @route   DELETE /api/salaries/:id
// @access  Private (Founder only)
exports.deleteSalary = async (req, res) => {
    try {
        const user = req.user;

        // Only founder can delete salary records
        if (user.role !== 'founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder can delete salary records'
            });
        }

        const salary = await Salary.findById(req.params.id);

        if (!salary) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found'
            });
        }

        await Salary.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Salary record deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};