// backend/src/models/Performance.js
// Performance Score / KPI System - Performance Schema
// Integration: Uses existing User model reference
// Score Rules: Task completed = +10, Late login = -5, Approved leave = no penalty

const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
    // Employee reference
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Total accumulated score
    totalScore: {
        type: Number,
        default: 0
    },
    // Count of tasks completed in this period
    tasksCompleted: {
        type: Number,
        default: 0
    },
    // Count of late logins in this period
    lateLogins: {
        type: Number,
        default: 0
    },
    // Approved leaves count (no penalty, just for tracking)
    approvedLeaves: {
        type: Number,
        default: 0
    },
    // Month (1-12)
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    // Year (e.g., 2025)
    year: {
        type: Number,
        required: true
    },
    // Department for filtering
    department: {
        type: String,
        enum: ['technical', 'sales', 'finance'],
        required: true
    },
    // Score breakdown for transparency
    scoreBreakdown: {
        taskPoints: { type: Number, default: 0 },       // +10 per task
        lateLoginPenalty: { type: Number, default: 0 }  // -5 per late login
    }
}, {
    timestamps: true
});

// Compound index for unique employee + month + year combination
performanceSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Index for department-based queries
performanceSchema.index({ department: 1, month: 1, year: 1 });

// Index for leaderboard queries
performanceSchema.index({ totalScore: -1 });

// Static method to calculate total score from breakdown
performanceSchema.methods.recalculateScore = function() {
    this.totalScore = this.scoreBreakdown.taskPoints + this.scoreBreakdown.lateLoginPenalty;
    return this.totalScore;
};

module.exports = mongoose.model('Performance', performanceSchema);
