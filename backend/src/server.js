// backend/src/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');

dotenv.config();

const auth = require('./routes/authRoutes');
const users = require('./routes/userRoutes');
const dashboard = require('./routes/dashboardRoutes');
const attendance = require('./routes/attendanceRoutes');
const tasks = require('./routes/taskRoutes');
const salaries = require('./routes/salaryRoutes');

// New Feature Routes - Added without modifying existing routes
const requests = require('./routes/requestRoutes');           // Approval Workflow System
const performance = require('./routes/performanceRoutes');     // Performance/KPI System
const notifications = require('./routes/notificationRoutes'); // Notification System
const roleChanges = require('./routes/roleChangeRoutes');     // Role Change Audit Log
const userManagement = require('./routes/userManagementRoutes'); // Enhanced User Management
const triggers = require('./routes/triggerRoutes');           // Integration Triggers

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/dashboard', dashboard);
app.use('/api/attendance', attendance);
app.use('/api/tasks', tasks);
app.use('/api/salaries', salaries);

// New Feature Route Mounting - Added without modifying existing routes
app.use('/api/requests', requests);              // Approval Workflow: /api/requests/*
app.use('/api/performance', performance);        // Performance/KPI: /api/performance/*
app.use('/api/notifications', notifications);    // Notifications: /api/notifications/*
app.use('/api/role-changes', roleChanges);       // Role Change Audit: /api/role-changes/*
app.use('/api/user-management', userManagement); // Enhanced User Mgmt: /api/user-management/*
app.use('/api/triggers', triggers);              // Integration Triggers: /api/triggers/*

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Only start the server if this file is run directly (not in tests)
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    
    connectDB();
    
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    process.on('unhandledRejection', (err, promise) => {
        console.log(`Error: ${err.message}`);
        server.close(() => process.exit(1));
    });
}

// Export the app for testing
module.exports = app;