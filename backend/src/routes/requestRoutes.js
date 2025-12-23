// backend/src/routes/requestRoutes.js
// Approval Workflow System Routes
// Endpoints for creating, viewing, approving, and rejecting requests

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const requestController = require('../controllers/requestController');

// All routes require authentication
router.use(protect);

// @route   GET /api/requests/my-requests
// @desc    Get logged-in user's requests
// @access  Private
router.get('/my-requests', requestController.getMyRequests);

// @route   GET /api/requests/pending
// @desc    Get pending requests for approval (Department Heads, Founder, Co-Founder)
// @access  Private
router.get('/pending', requestController.getPendingRequests);

// @route   GET /api/requests
// @desc    Get all requests (filtered by role)
// @access  Private
router.get('/', requestController.getRequests);

// @route   POST /api/requests
// @desc    Create a new request (Employees only)
// @access  Private
router.post('/', requestController.createRequest);

// @route   GET /api/requests/:id
// @desc    Get single request by ID
// @access  Private
router.get('/:id', requestController.getRequest);

// @route   PUT /api/requests/:id/approve
// @desc    Approve a request (Department Heads, Founder, Co-Founder)
// @access  Private
router.put('/:id/approve', requestController.approveRequest);

// @route   PUT /api/requests/:id/reject
// @desc    Reject a request (Department Heads, Founder, Co-Founder)
// @access  Private
router.put('/:id/reject', requestController.rejectRequest);

module.exports = router;
