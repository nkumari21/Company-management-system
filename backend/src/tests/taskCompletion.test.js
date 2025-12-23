// backend/src/tests/taskCompletion.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const app = require('../server');
const User = require('../models/User');
const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const connectDB = require('../config/database');

// Use test database
const TEST_DB_URI = process.env.MONGODB_URI.replace('company_management', 'company_management_test');

// Helper to ensure connection is ready with retry logic
const ensureConnection = async (retries = 3) => {
    if (mongoose.connection.readyState === 1) {
        return;
    }
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(TEST_DB_URI);
            return;
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

// Test users and tokens
let founderToken, techHeadToken, techEmployeeToken, salesEmployeeToken;
let founderId, techHeadId, techEmployeeId, salesEmployeeId;
let testTaskId, testTaskId2;

describe('Task Completion with File Upload Tests', () => {
    beforeAll(async () => {
        await ensureConnection();
        // Clean up
        await User.deleteMany({});
        await Task.deleteMany({});
        await TaskSubmission.deleteMany({});

        // Create test users
        const founderRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Founder',
                email: 'founder@tasktest.com',
                password: 'password123',
                role: 'founder'
            });
        founderToken = founderRes.body.token;
        founderId = founderRes.body.user.id;

        const techHeadRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Tech Head',
                email: 'techhead@tasktest.com',
                password: 'password123',
                role: 'technical_head',
                department: 'technical'
            });
        techHeadToken = techHeadRes.body.token;
        techHeadId = techHeadRes.body.user.id;

        const techEmpRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Tech Employee',
                email: 'techemp@tasktest.com',
                password: 'password123',
                role: 'employee',
                department: 'technical'
            });
        techEmployeeToken = techEmpRes.body.token;
        techEmployeeId = techEmpRes.body.user.id;

        const salesEmpRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Sales Employee',
                email: 'salesemp@tasktest.com',
                password: 'password123',
                role: 'employee',
                department: 'sales'
            });
        salesEmployeeToken = salesEmpRes.body.token;
        salesEmployeeId = salesEmpRes.body.user.id;

        // Create test tasks
        const task1Res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${founderToken}`)
            .send({
                title: 'Test Task for Tech Employee',
                description: 'Task to be completed with file',
                assignedTo: techEmployeeId,
                priority: 'high'
            });
        testTaskId = task1Res.body.data._id;

        const task2Res = await request(app)
            .post('/api/tasks')
            .set('Authorization', `Bearer ${founderToken}`)
            .send({
                title: 'Second Task for Tech Employee',
                description: 'Another task',
                assignedTo: techEmployeeId,
                priority: 'medium'
            });
        testTaskId2 = task2Res.body.data._id;
    });

    afterAll(async () => {
        try {
            await User.deleteMany({});
            await Task.deleteMany({});
            await TaskSubmission.deleteMany({});
        } catch (error) {
            // Ignore cleanup errors
        }
        // Clean up test files
        const uploadsDir = path.join(__dirname, '../../uploads/tasks');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
                if (file.startsWith('task-')) {
                    try {
                        fs.unlinkSync(path.join(uploadsDir, file));
                    } catch (e) {
                        // Ignore file cleanup errors
                    }
                }
            });
        }
        // Safely close connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });

    // Create test file
    const testFilePath = path.join(__dirname, 'test-completion.csv');
    const invalidFilePath = path.join(__dirname, 'test-invalid.txt');

    beforeAll(() => {
        fs.writeFileSync(testFilePath, 'Task,Status,Notes\nTask1,Done,Completed successfully');
        fs.writeFileSync(invalidFilePath, 'This is an invalid file type');
    });

    afterAll(() => {
        if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        if (fs.existsSync(invalidFilePath)) fs.unlinkSync(invalidFilePath);
    });

    describe('POST /api/tasks/:id/complete', () => {
        it('Assigned user can complete task with valid CSV file (200)', async () => {
            const res = await request(app)
                .post(`/api/tasks/${testTaskId}/complete`)
                .set('Authorization', `Bearer ${techEmployeeToken}`)
                .attach('completionFile', testFilePath);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.task.status).toBe('completed');
            expect(res.body.data.submission).toHaveProperty('fileName');
            expect(res.body.data.submission).toHaveProperty('fileType');
            expect(res.body.data.submission.fileType).toBe('csv');
        });

        it('Task cannot be completed without file (400)', async () => {
            const res = await request(app)
                .post(`/api/tasks/${testTaskId2}/complete`)
                .set('Authorization', `Bearer ${techEmployeeToken}`);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('File upload is mandatory');
        });

        it('Other user cannot complete task not assigned to them (403)', async () => {
            const res = await request(app)
                .post(`/api/tasks/${testTaskId2}/complete`)
                .set('Authorization', `Bearer ${salesEmployeeToken}`)
                .attach('completionFile', testFilePath);

            expect(res.statusCode).toEqual(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Only the assigned user');
        });

        it('Invalid file type is rejected (400)', async () => {
            const res = await request(app)
                .post(`/api/tasks/${testTaskId2}/complete`)
                .set('Authorization', `Bearer ${techEmployeeToken}`)
                .attach('completionFile', invalidFilePath);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Only PDF and CSV');
        });

        it('Cannot complete already completed task (400)', async () => {
            const res = await request(app)
                .post(`/api/tasks/${testTaskId}/complete`)
                .set('Authorization', `Bearer ${techEmployeeToken}`)
                .attach('completionFile', testFilePath);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('already completed');
        });

        it('Returns 401 when not authenticated', async () => {
            const res = await request(app)
                .post(`/api/tasks/${testTaskId2}/complete`)
                .attach('completionFile', testFilePath);

            expect(res.statusCode).toEqual(401);
        });

        it('Status changes to COMPLETED only after valid upload', async () => {
            // First verify task is not completed
            const beforeRes = await request(app)
                .get(`/api/tasks/${testTaskId2}`)
                .set('Authorization', `Bearer ${techEmployeeToken}`);

            expect(beforeRes.body.data.status).not.toBe('completed');

            // Complete with file
            const completeRes = await request(app)
                .post(`/api/tasks/${testTaskId2}/complete`)
                .set('Authorization', `Bearer ${techEmployeeToken}`)
                .attach('completionFile', testFilePath);

            expect(completeRes.statusCode).toEqual(200);
            expect(completeRes.body.data.task.status).toBe('completed');

            // Verify in database
            const afterRes = await request(app)
                .get(`/api/tasks/${testTaskId2}`)
                .set('Authorization', `Bearer ${techEmployeeToken}`);

            expect(afterRes.body.data.status).toBe('completed');
        });
    });

    describe('GET /api/tasks/:id/submission - Access Control', () => {
        it('Assigned user can view their submission', async () => {
            const res = await request(app)
                .get(`/api/tasks/${testTaskId}/submission`)
                .set('Authorization', `Bearer ${techEmployeeToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('fileName');
        });

        it('Founder can view any submission', async () => {
            const res = await request(app)
                .get(`/api/tasks/${testTaskId}/submission`)
                .set('Authorization', `Bearer ${founderToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('Department head can view their department submissions', async () => {
            const res = await request(app)
                .get(`/api/tasks/${testTaskId}/submission`)
                .set('Authorization', `Bearer ${techHeadToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });

        it('Other employee cannot view submission (403)', async () => {
            const res = await request(app)
                .get(`/api/tasks/${testTaskId}/submission`)
                .set('Authorization', `Bearer ${salesEmployeeToken}`);

            expect(res.statusCode).toEqual(403);
            expect(res.body.success).toBe(false);
        });

        it('Returns 401 when not authenticated', async () => {
            const res = await request(app)
                .get(`/api/tasks/${testTaskId}/submission`);

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('Task Assignment Access Rules', () => {
        let restrictedTaskId;

        beforeAll(async () => {
            // Create task assigned to sales employee
            const taskRes = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${founderToken}`)
                .send({
                    title: 'Sales Task',
                    description: 'Task for sales employee',
                    assignedTo: salesEmployeeId,
                    priority: 'low'
                });
            restrictedTaskId = taskRes.body.data._id;
        });

        it('Assigned user can view their task', async () => {
            const res = await request(app)
                .get(`/api/tasks/${restrictedTaskId}`)
                .set('Authorization', `Bearer ${salesEmployeeToken}`);

            expect(res.statusCode).toEqual(200);
        });

        it('Higher role (Founder) can view any task', async () => {
            const res = await request(app)
                .get(`/api/tasks/${restrictedTaskId}`)
                .set('Authorization', `Bearer ${founderToken}`);

            expect(res.statusCode).toEqual(200);
        });

        it('Other employee cannot view task not assigned to them (403)', async () => {
            const res = await request(app)
                .get(`/api/tasks/${restrictedTaskId}`)
                .set('Authorization', `Bearer ${techEmployeeToken}`);

            expect(res.statusCode).toEqual(403);
        });

        it('Tech Head cannot view sales department task (403)', async () => {
            const res = await request(app)
                .get(`/api/tasks/${restrictedTaskId}`)
                .set('Authorization', `Bearer ${techHeadToken}`);

            expect(res.statusCode).toEqual(403);
        });
    });

    describe('File Metadata Storage', () => {
        it('Submission stores correct file metadata', async () => {
            const submission = await TaskSubmission.findOne({ task: testTaskId });

            expect(submission).not.toBeNull();
            expect(submission.fileName).toBe('test-completion.csv');
            expect(submission.fileType).toBe('csv');
            expect(submission.fileSize).toBeGreaterThan(0);
            expect(submission.filePath).toBeTruthy();
            expect(submission.submittedAt).toBeTruthy();
            expect(submission.department).toBe('technical');
        });

        it('Submission is linked to correct task and user', async () => {
            const submission = await TaskSubmission.findOne({ task: testTaskId })
                .populate('task')
                .populate('submittedBy');

            expect(submission.task._id.toString()).toBe(testTaskId);
            expect(submission.submittedBy._id.toString()).toBe(techEmployeeId);
        });
    });
});
