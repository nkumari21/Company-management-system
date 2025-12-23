// backend/src/controllers/taskController.js

const Task = require('../models/Task');
const User = require('../models/User');
const { getDepartmentFromRole, getRoleLevel } = require('../middleware/rbac');

// @desc    Get all tasks (filtered by role)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        // Founder can see all tasks
        if (user.role === 'founder') {
            query = {};
        }
        // Co-founder can see all tasks
        else if (user.role === 'co-founder') {
            query = {};
        }
        // Department heads can ONLY see their department's tasks
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            query = { department: department };
        }
        // Employees can ONLY see tasks assigned to them
        else if (user.role === 'employee') {
            query = { assignedTo: user._id };
        }

        const tasks = await Task.find(query)
            .populate('assignedTo', 'name email department')
            .populate('assignedBy', 'name email')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email department')
            .populate('assignedBy', 'name email');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const user = req.user;

        // Employees can only see their own tasks
        if (user.role === 'employee') {
            if (task.assignedTo._id.toString() !== user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this task'
                });
            }
        }
        // Department heads can only see tasks in their department
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            if (task.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private (Founder, Co-Founder, Department Heads)
exports.createTask = async (req, res) => {
    try {
        const user = req.user;
        const { title, description, assignedTo, priority, dueDate } = req.body;

        // Employees cannot create tasks
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees cannot create tasks'
            });
        }

        const assignee = await User.findById(assignedTo);
        if (!assignee) {
            return res.status(404).json({
                success: false,
                message: 'Assigned user not found'
            });
        }

        // Can only assign tasks to lower roles
        const creatorLevel = getRoleLevel(user.role);
        const assigneeLevel = getRoleLevel(assignee.role);

        if (creatorLevel <= assigneeLevel) {
            return res.status(403).json({
                success: false,
                message: 'Can only assign tasks to lower role levels'
            });
        }

        // Department heads can only assign to employees in their department
        if (user.role.includes('_head')) {
            const userDepartment = getDepartmentFromRole(user.role);
            if (assignee.role !== 'employee') {
                return res.status(403).json({
                    success: false,
                    message: 'Department heads can only assign tasks to employees'
                });
            }
            if (assignee.department !== userDepartment) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
        }

        const task = await Task.create({
            title,
            description,
            assignedTo,
            assignedBy: user._id,
            department: assignee.department,
            priority: priority || 'medium',
            dueDate
        });

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email department')
            .populate('assignedBy', 'name email');

        res.status(201).json({
            success: true,
            data: populatedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
    try {
        const user = req.user;
        let task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Employees can only update status of their own tasks
        if (user.role === 'employee') {
            if (task.assignedTo.toString() !== user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this task'
                });
            }
            // Employees can only update status
            const allowedUpdates = { status: req.body.status };
            if (req.body.status === 'completed') {
                allowedUpdates.completedAt = new Date();
            }
            task = await Task.findByIdAndUpdate(req.params.id, allowedUpdates, {
                new: true,
                runValidators: true
            });
        }
        // Department heads can only update tasks in their department
        else if (user.role.includes('_head')) {
            const department = getDepartmentFromRole(user.role);
            if (task.department !== department) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
            if (req.body.status === 'completed' && task.status !== 'completed') {
                req.body.completedAt = new Date();
            }
            task = await Task.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            });
        }
        // Founder and co-founder can update any task
        else {
            if (req.body.status === 'completed' && task.status !== 'completed') {
                req.body.completedAt = new Date();
            }
            task = await Task.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true
            });
        }

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email department')
            .populate('assignedBy', 'name email');

        res.status(200).json({
            success: true,
            data: populatedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Founder, Co-Founder, Department Heads)
exports.deleteTask = async (req, res) => {
    try {
        const user = req.user;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Employees cannot delete tasks
        if (user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Employees cannot delete tasks'
            });
        }

        // Department heads can only delete tasks in their department
        if (user.role.includes('_head')) {
            const userDepartment = getDepartmentFromRole(user.role);
            if (task.department !== userDepartment) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this department.'
                });
            }
        }

        await Task.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
