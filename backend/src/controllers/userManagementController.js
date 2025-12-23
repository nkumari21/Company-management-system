// backend/src/controllers/userManagementController.js
// Enhanced User Management Controller
// Provides role change functionality with built-in audit logging
// This is an ALTERNATIVE to the existing userController for role changes
// Use POST /api/user-management/change-role/:id for role changes with audit logging

const User = require('../models/User');
const { getDepartmentFromRole, getRoleLevel } = require('../middleware/rbac');
const { logRoleChange } = require('../services/roleChangeService');

// @desc    Change user role with audit logging
// @route   POST /api/user-management/change-role/:id
// @access  Private (Founder, Co-Founder only)
exports.changeUserRole = async (req, res) => {
    try {
        const currentUser = req.user;
        const targetUserId = req.params.id;
        const { newRole, reason } = req.body;

        // Only founder and co-founder can change roles
        if (currentUser.role !== 'founder' && currentUser.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can change user roles'
            });
        }

        // Validate new role
        const validRoles = ['founder', 'co-founder', 'technical_head', 'sales_head', 'finance_head', 'employee'];
        if (!newRole || !validRoles.includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Find target user
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check role hierarchy - cannot change same or higher level
        const currentLevel = getRoleLevel(currentUser.role);
        const targetLevel = getRoleLevel(targetUser.role);
        const newRoleLevel = getRoleLevel(newRole);

        if (currentLevel <= targetLevel) {
            return res.status(403).json({
                success: false,
                message: 'Cannot change role of user with same or higher role level'
            });
        }

        // Cannot assign role equal to or higher than own
        if (newRoleLevel >= currentLevel) {
            return res.status(403).json({
                success: false,
                message: 'Cannot assign role equal to or higher than your own'
            });
        }

        // Check if role is actually changing
        if (targetUser.role === newRole) {
            return res.status(400).json({
                success: false,
                message: 'User already has this role'
            });
        }

        // Store old role for audit log
        const oldRole = targetUser.role;

        // Prepare user snapshot for audit log
        const userSnapshot = {
            name: targetUser.name,
            email: targetUser.email,
            department: targetUser.department
        };

        // Prepare audit info (optional - IP/UserAgent)
        const auditInfo = {};
        if (req.ip) auditInfo.ipAddress = req.ip;
        if (req.headers['user-agent']) auditInfo.userAgent = req.headers['user-agent'];

        // Handle department changes based on new role
        let newDepartment = targetUser.department;

        // If changing to department head, validate department
        if (newRole.includes('_head')) {
            const requiredDepartment = getDepartmentFromRole(newRole);
            if (req.body.department && req.body.department !== requiredDepartment) {
                return res.status(400).json({
                    success: false,
                    message: `Department head role ${newRole} must have department: ${requiredDepartment}`
                });
            }
            newDepartment = requiredDepartment;
        }
        // If changing to founder/co-founder, remove department
        else if (newRole === 'founder' || newRole === 'co-founder') {
            newDepartment = null;
        }
        // If changing to employee, department is required
        else if (newRole === 'employee') {
            if (!targetUser.department && !req.body.department) {
                return res.status(400).json({
                    success: false,
                    message: 'Department is required for employees'
                });
            }
            newDepartment = req.body.department || targetUser.department;
        }

        // Update user role
        targetUser.role = newRole;
        targetUser.department = newDepartment;
        await targetUser.save();

        // Create audit log entry (this also creates notification)
        await logRoleChange({
            changedUserId: targetUserId,
            oldRole,
            newRole,
            changedBy: currentUser._id,
            changedByName: currentUser.name,
            reason: reason || '',
            userSnapshot,
            auditInfo
        });

        res.status(200).json({
            success: true,
            message: `Role changed from ${oldRole} to ${newRole}`,
            data: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                oldRole,
                newRole,
                department: targetUser.department
            }
        });
    } catch (error) {
        console.error('Change role error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get users eligible for role change
// @route   GET /api/user-management/eligible-for-role-change
// @access  Private (Founder, Co-Founder only)
exports.getEligibleUsers = async (req, res) => {
    try {
        const currentUser = req.user;

        // Only founder and co-founder can change roles
        if (currentUser.role !== 'founder' && currentUser.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can view users eligible for role change'
            });
        }

        let query = {};
        const currentLevel = getRoleLevel(currentUser.role);

        // Founder can change anyone below them
        if (currentUser.role === 'founder') {
            query = { role: { $ne: 'founder' } };
        }
        // Co-founder can change department heads and employees only
        else if (currentUser.role === 'co-founder') {
            query = { role: { $in: ['technical_head', 'sales_head', 'finance_head', 'employee'] } };
        }

        const users = await User.find(query).select('name email role department');

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
