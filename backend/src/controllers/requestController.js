// backend/src/controllers/requestController.js
// Approval Workflow System Controller
// RBAC: Employees create requests, Department Heads approve/reject their department's requests

const Request = require('../models/Request');
const User = require('../models/User');
const { getDepartmentFromRole, getRoleLevel } = require('../middleware/rbac');
const { notifyRequestApproved, notifyRequestRejected } = require('../services/notificationService');
const { onLeaveApproved } = require('../services/performanceService');

// @desc    Create a new request (leave, expense, or task)
// @route   POST /api/requests
// @access  Private (Employees only)
exports.createRequest = async (req, res) => {
    try {
        const user = req.user;

        // Only employees can create requests
        if (user.role !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Only employees can create requests'
            });
        }

        const { type, description, metadata } = req.body;

        // Validate required fields
        if (!type || !description) {
            return res.status(400).json({
                success: false,
                message: 'Type and description are required'
            });
        }

        // Validate request type
        const validTypes = ['leave', 'expense', 'task'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid request type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        // Create the request
        const request = await Request.create({
            type,
            description,
            status: 'pending',
            createdBy: user._id,
            department: user.department,
            metadata: metadata || {}
        });

        const populatedRequest = await Request.findById(request._id)
            .populate('createdBy', 'name email department');

        res.status(201).json({
            success: true,
            message: 'Request created successfully',
            data: populatedRequest
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all requests (filtered by role)
// @route   GET /api/requests
// @access  Private
exports.getRequests = async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        // Founder and Co-founder can see all requests
        if (user.role === 'founder' || user.role === 'co-founder') {
            query = {};
        }
        // Department heads can only see their department's requests
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            query = { department };
        }
        // Employees can only see their own requests
        else if (user.role === 'employee') {
            query = { createdBy: user._id };
        }

        // Optional status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Optional type filter
        if (req.query.type) {
            query.type = req.query.type;
        }

        const requests = await Request.find(query)
            .populate('createdBy', 'name email department')
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single request
// @route   GET /api/requests/:id
// @access  Private
exports.getRequest = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('createdBy', 'name email department')
            .populate('approvedBy', 'name email');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        const user = req.user;

        // Check access permissions
        // Employees can only view their own requests
        if (user.role === 'employee') {
            if (request.createdBy._id.toString() !== user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this request'
                });
            }
        }
        // Department heads can only view their department's requests
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            if (request.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view requests from other departments'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Approve a request
// @route   PUT /api/requests/:id/approve
// @access  Private (Department Heads, Founder, Co-Founder)
exports.approveRequest = async (req, res) => {
    try {
        const user = req.user;
        const request = await Request.findById(req.params.id)
            .populate('createdBy', 'name email department');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Employees cannot approve requests
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees cannot approve requests'
            });
        }

        // Department heads can only approve their department's requests
        if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            if (request.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot approve requests from other departments'
                });
            }
        }

        // Check if request is already processed
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Request is already ${request.status}`
            });
        }

        // Update request status
        request.status = 'approved';
        request.approvedBy = user._id;
        request.approvedAt = new Date();

        await request.save();

        // Send notification to the request creator
        await notifyRequestApproved(
            request.createdBy._id,
            request.type,
            request._id,
            user.name
        );

        // If leave request is approved, update performance tracking
        if (request.type === 'leave') {
            await onLeaveApproved(request.createdBy._id);
        }

        const updatedRequest = await Request.findById(request._id)
            .populate('createdBy', 'name email department')
            .populate('approvedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Request approved successfully',
            data: updatedRequest
        });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Reject a request
// @route   PUT /api/requests/:id/reject
// @access  Private (Department Heads, Founder, Co-Founder)
exports.rejectRequest = async (req, res) => {
    try {
        const user = req.user;
        const { reason } = req.body;

        const request = await Request.findById(req.params.id)
            .populate('createdBy', 'name email department');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Employees cannot reject requests
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees cannot reject requests'
            });
        }

        // Department heads can only reject their department's requests
        if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            if (request.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot reject requests from other departments'
                });
            }
        }

        // Check if request is already processed
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Request is already ${request.status}`
            });
        }

        // Update request status
        request.status = 'rejected';
        request.approvedBy = user._id;
        request.approvedAt = new Date();
        request.rejectionReason = reason || '';

        await request.save();

        // Send notification to the request creator
        await notifyRequestRejected(
            request.createdBy._id,
            request.type,
            request._id,
            user.name,
            reason
        );

        const updatedRequest = await Request.findById(request._id)
            .populate('createdBy', 'name email department')
            .populate('approvedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Request rejected',
            data: updatedRequest
        });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get my requests (employee's own requests)
// @route   GET /api/requests/my-requests
// @access  Private
exports.getMyRequests = async (req, res) => {
    try {
        const user = req.user;

        const query = { createdBy: user._id };

        // Optional status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        const requests = await Request.find(query)
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get pending requests for department head
// @route   GET /api/requests/pending
// @access  Private (Department Heads, Founder, Co-Founder)
exports.getPendingRequests = async (req, res) => {
    try {
        const user = req.user;
        let query = { status: 'pending' };

        // Employees cannot view pending requests (other than their own via my-requests)
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view pending requests'
            });
        }

        // Department heads can only see their department's pending requests
        if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            query.department = department;
        }

        const requests = await Request.find(query)
            .populate('createdBy', 'name email department')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
