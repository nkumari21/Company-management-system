// backend/src/controllers/userController.js

const User = require('../models/User');
const { canAccessUser, getDepartmentFromRole, getRoleLevel } = require('../middleware/rbac');

// @desc    Get all users (filtered by role-based access)
// @route   GET /api/users
// @access  Private (Founder, Co-Founder, Department Heads)
exports.getUsers = async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        // Founder can see all users
        if (user.role === 'founder') {
            query = {};
        }
        // Co-founder can see everyone except founder
        else if (user.role === 'co-founder') {
            query = { role: { $ne: 'founder' } };
        }
        // Department heads can ONLY see employees in their department
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            query = {
                role: 'employee',
                department: department
            };
        }
        // Employees cannot list users
        else if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees are not authorized to view user list'
            });
        }

        const users = await User.find(query).select('-password');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Self, Founder, Co-Founder, Department Head of same department)
exports.getUser = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id).select('-password');

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentUser = req.user;

        // Check if current user can access target user
        if (!canAccessUser(currentUser, targetUser)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this department.'
            });
        }

        res.status(200).json({
            success: true,
            data: targetUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Founder, Co-Founder, Department Heads for their dept)
exports.updateUser = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentUser = req.user;

        // Employees cannot update any users
        if (currentUser.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees are not authorized to update users'
            });
        }

        // Check role hierarchy - cannot update same or higher level
        const currentLevel = getRoleLevel(currentUser.role);
        const targetLevel = getRoleLevel(targetUser.role);

        if (currentLevel <= targetLevel) {
            return res.status(403).json({
                success: false,
                message: 'Cannot update user of same or higher role level'
            });
        }

        // Department heads can only update employees in their department
        if (currentUser.role.includes('_head')) {
            const headDepartment = getDepartmentFromRole(currentUser.role);
            if (targetUser.role !== 'employee' || targetUser.department !== headDepartment) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
        }

        // Prevent role escalation
        if (req.body.role) {
            const newRoleLevel = getRoleLevel(req.body.role);
            if (newRoleLevel >= currentLevel) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot assign role equal to or higher than your own'
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Founder, Co-Founder only)
exports.deleteUser = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const currentUser = req.user;

        // Only founder and co-founder can delete
        if (currentUser.role !== 'founder' && currentUser.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can delete users'
            });
        }

        // Check role hierarchy
        const currentLevel = getRoleLevel(currentUser.role);
        const targetLevel = getRoleLevel(targetUser.role);

        if (currentLevel <= targetLevel) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete user of same or higher role level'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
