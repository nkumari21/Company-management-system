// backend/src/models/Request.js
// Approval Workflow System - Request Schema
// Integration: Uses existing User model reference, department-based filtering

const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    // Type of request: leave, expense, or task request
    type: {
        type: String,
        enum: ['leave', 'expense', 'task'],
        required: [true, 'Request type is required']
    },
    // Detailed description of the request
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    // Request status - default is pending
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Employee who created the request (reference to User model)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Department of the employee (for filtering by department heads)
    department: {
        type: String,
        enum: ['technical', 'sales', 'finance'],
        required: true
    },
    // Department head who approved/rejected (reference to User model)
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Timestamp when approved/rejected
    approvedAt: {
        type: Date,
        default: null
    },
    // Optional: Additional metadata for specific request types
    metadata: {
        // For leave requests
        leaveStartDate: { type: Date },
        leaveEndDate: { type: Date },
        leaveType: {
            type: String,
            enum: ['sick', 'casual', 'annual', 'other']
        },
        // For expense requests
        expenseAmount: { type: Number },
        expenseCurrency: { type: String, default: 'INR' },
        expenseCategory: { type: String },
        // For task requests
        taskTitle: { type: String },
        taskPriority: {
            type: String,
            enum: ['low', 'medium', 'high']
        }
    },
    // Rejection reason (if rejected)
    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound index for efficient querying by department and status
requestSchema.index({ department: 1, status: 1 });

// Index for querying by creator
requestSchema.index({ createdBy: 1, status: 1 });

// Index for date-based queries
requestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Request', requestSchema);
