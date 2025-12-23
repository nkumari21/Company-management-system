// backend/src/routes/taskRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const { getDepartmentFromRole } = require('../middleware/rbac');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/tasks');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `task-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter - only PDF and CSV
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
    const allowedExtensions = ['.pdf', '.csv'];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext) || allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and CSV files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

router.use(protect);

router.route('/')
    .get(getTasks)
    .post(createTask);

router.route('/:id')
    .get(getTask)
    .put(updateTask)
    .delete(deleteTask);

// @desc    Complete task with file submission (MANDATORY)
// @route   POST /api/tasks/:id/complete
// @access  Private (Only assigned user)
router.post('/:id/complete', upload.single('completionFile'), async (req, res) => {
    try {
        const user = req.user;
        const task = await Task.findById(req.params.id);

        if (!task) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Only assigned user can complete the task
        if (task.assignedTo.toString() !== user._id.toString()) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                message: 'Only the assigned user can complete this task'
            });
        }

        // File is MANDATORY - check exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File upload is mandatory for task completion. Please upload a PDF or CSV file.'
            });
        }

        // Check file type
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.pdf' && ext !== '.csv') {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Only PDF and CSV files are allowed'
            });
        }

        // Check if task is already completed
        if (task.status === 'completed') {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Task is already completed'
            });
        }

        // Check if submission already exists
        const existingSubmission = await TaskSubmission.findOne({ task: task._id });
        if (existingSubmission) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Submission already exists for this task'
            });
        }

        // Update task status to completed
        task.status = 'completed';
        task.completedAt = new Date();
        await task.save();

        // Create task submission
        const submission = await TaskSubmission.create({
            task: task._id,
            submittedBy: user._id,
            fileName: req.file.originalname,
            fileType: ext.replace('.', ''),
            fileSize: req.file.size,
            filePath: req.file.path,
            submittedAt: new Date(),
            department: user.department
        });

        res.status(200).json({
            success: true,
            message: 'Task completed successfully with file submission',
            data: { task, submission }
        });
    } catch (error) {
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get task submission/file
// @route   GET /api/tasks/:id/submission
// @access  Private (Assigned user, Department heads for their dept, Founder/Co-founder)
router.get('/:id/submission', async (req, res) => {
    try {
        const user = req.user;
        const task = await Task.findById(req.params.id).populate('assignedTo', 'department role');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const submission = await TaskSubmission.findOne({ task: task._id })
            .populate('submittedBy', 'name email department');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'No submission found for this task'
            });
        }

        // Access control for viewing submission
        // Founder and co-founder can view all
        if (user.role === 'founder' || user.role === 'co-founder') {
            return res.status(200).json({
                success: true,
                data: submission
            });
        }

        // Department heads can view their department's submissions
        if (user.role.includes('_head')) {
            const headDepartment = getDepartmentFromRole(user.role);
            if (submission.department !== headDepartment) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view submissions outside your department'
                });
            }
            return res.status(200).json({
                success: true,
                data: submission
            });
        }

        // Employees can only view their own submissions
        if (user.role === 'employee') {
            if (submission.submittedBy._id.toString() !== user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this submission'
                });
            }
            return res.status(200).json({
                success: true,
                data: submission
            });
        }

        return res.status(403).json({
            success: false,
            message: 'Not authorized to view this submission'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Download task submission file
// @route   GET /api/tasks/:id/submission/download
// @access  Private (Same access as viewing)
router.get('/:id/submission/download', async (req, res) => {
    try {
        const user = req.user;
        const task = await Task.findById(req.params.id).populate('assignedTo', 'department role');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const submission = await TaskSubmission.findOne({ task: task._id })
            .populate('submittedBy', 'name email department');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'No submission found for this task'
            });
        }

        // Access control
        let canAccess = false;

        if (user.role === 'founder' || user.role === 'co-founder') {
            canAccess = true;
        } else if (user.role.includes('_head')) {
            const headDepartment = getDepartmentFromRole(user.role);
            canAccess = submission.department === headDepartment;
        } else if (user.role === 'employee') {
            canAccess = submission.submittedBy._id.toString() === user._id.toString();
        }

        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to download this file'
            });
        }

        if (!fs.existsSync(submission.filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        res.download(submission.filePath, submission.fileName);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 10MB'
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    if (error.message === 'Only PDF and CSV files are allowed') {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    next(error);
});

module.exports = router;