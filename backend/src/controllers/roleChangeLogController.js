// backend/src/controllers/roleChangeLogController.js
// Role Change Audit Log Controller
// APIs for viewing role change history

const roleChangeService = require('../services/roleChangeService');
const { getRoleLevel } = require('../middleware/rbac');

// @desc    Get all role change logs
// @route   GET /api/role-changes
// @access  Private (Founder, Co-Founder only)
exports.getRoleChangeLogs = async (req, res) => {
    try {
        const user = req.user;

        // Only founder and co-founder can view audit logs
        if (user.role !== 'founder' && user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can view role change audit logs'
            });
        }

        const { startDate, endDate, oldRole, newRole, page, limit } = req.query;

        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (oldRole) filters.oldRole = oldRole;
        if (newRole) filters.newRole = newRole;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        const result = await roleChangeService.getAllRoleChanges(filters, options);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get role change history for a specific user
// @route   GET /api/role-changes/user/:userId
// @access  Private (Founder, Co-Founder, or Self)
exports.getUserRoleHistory = async (req, res) => {
    try {
        const user = req.user;
        const { userId } = req.params;
        const { page, limit } = req.query;

        // Users can view their own role history, founders/co-founders can view anyone's
        if (user._id.toString() !== userId &&
            user.role !== 'founder' &&
            user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this user\'s role history'
            });
        }

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        const result = await roleChangeService.getUserRoleHistory(userId, options);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get role changes made by a specific admin
// @route   GET /api/role-changes/by-admin/:adminId
// @access  Private (Founder only)
exports.getChangesByAdmin = async (req, res) => {
    try {
        const user = req.user;
        const { adminId } = req.params;
        const { page, limit } = req.query;

        // Only founder can view changes by admin
        if (user.role !== 'founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder can view changes by specific admins'
            });
        }

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        const result = await roleChangeService.getChangesByAdmin(adminId, options);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get my role change history
// @route   GET /api/role-changes/my-history
// @access  Private
exports.getMyRoleHistory = async (req, res) => {
    try {
        const user = req.user;
        const { page, limit } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        };

        const result = await roleChangeService.getUserRoleHistory(user._id, options);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get role change statistics
// @route   GET /api/role-changes/stats
// @access  Private (Founder, Co-Founder only)
exports.getRoleChangeStats = async (req, res) => {
    try {
        const user = req.user;

        // Only founder and co-founder can view stats
        if (user.role !== 'founder' && user.role !== 'co-founder') {
            return res.status(403).json({
                success: false,
                message: 'Only Founder and Co-Founder can view role change statistics'
            });
        }

        const { startDate, endDate } = req.query;

        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const stats = await roleChangeService.getRoleChangeStats(filters);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
