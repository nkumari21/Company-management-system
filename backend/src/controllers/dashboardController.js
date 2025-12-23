// backend/src/controllers/dashboardControllers.js
// Attendance is now automatically created on login

const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const Task = require('../models/Task');

exports.getDashboard = async (req, res) => {
    try {
        const user = req.user;
        let dashboardData = {};

        switch (user.role) {
            case 'founder':
                dashboardData = await getFounderDashboard();
                break;
            case 'co-founder':
                dashboardData = await getCoFounderDashboard();
                break;
            case 'technical_head':
            case 'sales_head':
            case 'finance_head':
                dashboardData = await getDepartmentHeadDashboard(user);
                break;
            case 'employee':
                dashboardData = await getEmployeeDashboard(user);
                break;
        }

        res.status(200).json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

async function getFounderDashboard() {
    const totalUsers = await User.countDocuments();
    const totalDepartments = 3;
    const recentAttendances = await Attendance.find().sort('-date').limit(10).populate('user', 'name email');
    
    return {
        role: 'Founder',
        permissions: ['create', 'read', 'update', 'delete'],
        stats: {
            totalUsers,
            totalDepartments,
            activeEmployees: await User.countDocuments({ isActive: true, role: 'employee' }),
            totalTasks: await Task.countDocuments()
        },
        recentActivity: recentAttendances
    };
}

async function getCoFounderDashboard() {
    const totalUsers = await User.countDocuments({ role: { $ne: 'founder' } });
    const departmentHeads = await User.find({ role: { $regex: '_head$' } });
    
    return {
        role: 'Co-Founder',
        permissions: ['create', 'read', 'update', 'delete'],
        scope: 'all-departments-except-founder-settings',
        stats: {
            totalUsers,
            departmentHeads: departmentHeads.length,
            activeEmployees: await User.countDocuments({ isActive: true, role: 'employee' })
        },
        departmentHeads
    };
}

async function getDepartmentHeadDashboard(user) {
    const department = user.role.split('_')[0];
    const departmentUsers = await User.find({ department });
    const departmentTasks = await Task.find({ department }).limit(10);
    
    return {
        role: `${department.charAt(0).toUpperCase() + department.slice(1)} Head`,
        permissions: ['create', 'read', 'update'],
        department,
        stats: {
            teamSize: departmentUsers.length,
            activeTasks: await Task.countDocuments({ department, status: { $ne: 'completed' } }),
            completedTasks: await Task.countDocuments({ department, status: 'completed' })
        },
        recentTasks: departmentTasks
    };
}

async function getEmployeeDashboard(user) {
    const myTasks = await Task.find({ assignedTo: user._id });
    const myAttendance = await Attendance.find({ user: user._id }).sort('-date').limit(30);
    const mySalary = await Salary.find({ user: user._id }).sort('-year -month').limit(6);
    
    return {
        role: 'Employee',
        permissions: ['read', 'create'],
        stats: {
            pendingTasks: myTasks.filter(task => task.status !== 'completed').length,
            completedTasks: myTasks.filter(task => task.status === 'completed').length,
            attendanceDays: myAttendance.filter(a => a.status === 'present').length
        },
        recentTasks: myTasks.slice(0, 5),
        recentAttendance: myAttendance.slice(0, 7)
    };
}