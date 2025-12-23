// backend/src/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance'); // Add this line

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required'
            });
        }

        // Validate role is valid
        const validRoles = ['founder', 'co-founder', 'technical_head', 'sales_head', 'finance_head', 'employee'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Validate department based on role
        let newDepartment = null;
        const validDepartments = ['technical', 'sales', 'finance'];

        if (role === 'founder' || role === 'co-founder') {
            // Founder/Co-Founder don't need department
            newDepartment = null;
        } else if (role === 'technical_head' || role === 'sales_head' || role === 'finance_head') {
            // Department heads need department
            if (!department) {
                return res.status(400).json({
                    success: false,
                    message: 'Department is required for department heads'
                });
            }
            if (!validDepartments.includes(department)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid department. Must be one of: ${validDepartments.join(', ')}`
                });
            }
            newDepartment = department;
        } else if (role === 'employee') {
            // Employees need department
            if (!department) {
                return res.status(400).json({
                    success: false,
                    message: 'Department is required for employees'
                });
            }
            if (!validDepartments.includes(department)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid department. Must be one of: ${validDepartments.join(', ')}`
                });
            }
            newDepartment = department;
        }

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role,
            department: newDepartment
        });

        // Create token
        const token = generateToken(user._id);

        // Return success response (password is excluded due to select: false)
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Registration error:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        // Handle duplicate key error (MongoDB error code 11000)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            message: 'Server error during registration. Please try again.'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create token
        const token = generateToken(user._id);

        // Auto-attendance on login
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Create attendance entry on login
        await Attendance.findOneAndUpdate(
            {
                user: user._id,
                date: today
            },
            {
                user: user._id,
                date: today,
                loginTime: new Date(),
                status: 'present',
                department: user.department || 'management',
                role: user.role
            },
            {
                upsert: true,
                new: true
            }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login. Please try again.'
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

// @desc    Logout user and record logout time
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        const user = req.user;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find today's attendance and record logout time
        const attendance = await Attendance.findOne({
            user: user._id,
            date: today
        });

        if (attendance && !attendance.logoutTime) {
            attendance.logoutTime = new Date();
            await attendance.save();
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully. Logout time recorded.'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout.'
        });
    }
};
