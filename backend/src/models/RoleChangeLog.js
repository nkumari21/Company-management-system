// backend/src/models/RoleChangeLog.js
// Role Change History / Audit Log Schema
// Tracks: Who changed role, when, old role → new role

const mongoose = require('mongoose');

const roleChangeLogSchema = new mongoose.Schema({
    // User whose role was changed
    changedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Previous role before change
    oldRole: {
        type: String,
        enum: ['founder', 'co-founder', 'technical_head', 'sales_head', 'finance_head', 'employee'],
        required: true
    },
    // New role after change
    newRole: {
        type: String,
        enum: ['founder', 'co-founder', 'technical_head', 'sales_head', 'finance_head', 'employee'],
        required: true
    },
    // User who made the change (Founder or Admin)
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Timestamp of the change
    changedAt: {
        type: Date,
        default: Date.now
    },
    // Optional: Reason for role change
    reason: {
        type: String,
        trim: true,
        maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    // Snapshot of user details at time of change (for historical accuracy)
    userSnapshot: {
        name: { type: String },
        email: { type: String },
        department: { type: String }
    },
    // IP address or session info (optional, for security audit)
    auditInfo: {
        ipAddress: { type: String },
        userAgent: { type: String }
    }
}, {
    timestamps: true // Adds createdAt (redundant with changedAt but useful) and updatedAt
});

// Index for querying by changed user
roleChangeLogSchema.index({ changedUserId: 1, changedAt: -1 });

// Index for querying by who made the change
roleChangeLogSchema.index({ changedBy: 1, changedAt: -1 });

// Index for date range queries
roleChangeLogSchema.index({ changedAt: -1 });

module.exports = mongoose.model('RoleChangeLog', roleChangeLogSchema);
