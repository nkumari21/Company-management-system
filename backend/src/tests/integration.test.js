// backend/src/tests/integration.test.js

const request = require('supertest');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const TaskSubmission = require('../models/TaskSubmission');

// Create Express app for testing
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const taskRoutes = require('../routes/taskRoutes');
const attendanceRoutes = require('../routes/attendanceRoutes');
const salaryRoutes = require('../routes/salaryRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salaries', salaryRoutes);

// Test database URI
const TEST_DB_URI = process.env.MONGODB_URI
  ? process.env.MONGODB_URI.replace('company_management', 'company_management_test')
  : 'mongodb://localhost:27017/company_management_test';

// Store tokens and IDs
let founderToken, techHeadToken, techEmployeeToken, salesEmployeeToken;
let founderId, techHeadId, techEmployeeId, salesEmployeeId;

// Helper to connect with retry logic
const connectWithRetry = async (retries = 3) => {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

describe('Company Management System Tests', () => {
  // Connect to test database before all tests
  beforeAll(async () => {
    try {
      await connectWithRetry();
      // Clean up collections
      await User.deleteMany({});
      await Task.deleteMany({});
      await Attendance.deleteMany({});
      await Salary.deleteMany({});
      await TaskSubmission.deleteMany({});
    } catch (error) {
      // Ignore connection errors in test - Jest will handle the timeout
    }
  }, 30000);

  // Disconnect after all tests
  afterAll(async () => {
    try {
      await User.deleteMany({});
      await Task.deleteMany({});
      await Attendance.deleteMany({});
      await Salary.deleteMany({});
      await TaskSubmission.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
    }
    try {
      // Safely close connection
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (error) {
      // Ignore close errors
    }
  }, 30000);

  // ============================================
  // AUTH TESTS
  // ============================================
  describe('Authentication', () => {
    test('should register a founder', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Founder',
          email: 'founder@test.com',
          password: 'password123',
          role: 'founder'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      founderToken = res.body.token;
      founderId = res.body.user.id;
    });

    test('should register technical head', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Tech Head',
          email: 'techhead@test.com',
          password: 'password123',
          role: 'technical_head',
          department: 'technical'
        });

      expect(res.statusCode).toBe(201);
      techHeadToken = res.body.token;
      techHeadId = res.body.user.id;
    });

    test('should register technical employee', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Tech Employee',
          email: 'techemployee@test.com',
          password: 'password123',
          role: 'employee',
          department: 'technical'
        });

      expect(res.statusCode).toBe(201);
      techEmployeeToken = res.body.token;
      techEmployeeId = res.body.user.id;
    });

    test('should register sales employee', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sales Employee',
          email: 'salesemployee@test.com',
          password: 'password123',
          role: 'employee',
          department: 'sales'
        });

      expect(res.statusCode).toBe(201);
      salesEmployeeToken = res.body.token;
      salesEmployeeId = res.body.user.id;
    });

    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'founder@test.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
    });

    test('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'founder@test.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  // ============================================
  // RBAC TESTS - Department Head Access Control
  // ============================================
  describe('Role-Based Access Control', () => {
    test('founder should see all users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    test('tech head should only see technical employees', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${techHeadToken}`);

      expect(res.statusCode).toBe(200);
      // Should only see technical employees
      const allTechnical = res.body.data.every(
        user => user.department === 'technical' && user.role === 'employee'
      );
      expect(allTechnical).toBe(true);
    });

    test('tech head should NOT see sales employees', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${techHeadToken}`);

      expect(res.statusCode).toBe(200);
      const hasSalesEmployee = res.body.data.some(
        user => user.department === 'sales'
      );
      expect(hasSalesEmployee).toBe(false);
    });

    test('employee should not access user list', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${techEmployeeToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // ============================================
  // TASK TESTS
  // ============================================
  describe('Task Management', () => {
    let taskId;

    test('founder can create task for any employee', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          title: 'Test Task',
          description: 'Test Description',
          assignedTo: techEmployeeId,
          priority: 'high'
        });

      expect(res.statusCode).toBe(201);
      taskId = res.body.data._id;
    });

    test('tech head can create task for tech employee', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${techHeadToken}`)
        .send({
          title: 'Tech Task',
          description: 'Technical work',
          assignedTo: techEmployeeId,
          priority: 'medium'
        });

      expect(res.statusCode).toBe(201);
    });

    test('tech head cannot assign task to sales employee', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${techHeadToken}`)
        .send({
          title: 'Cross Dept Task',
          description: 'Should fail',
          assignedTo: salesEmployeeId,
          priority: 'low'
        });

      expect(res.statusCode).toBe(403);
    });

    test('employee cannot create tasks', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${techEmployeeToken}`)
        .send({
          title: 'Employee Task',
          description: 'Should fail',
          assignedTo: techEmployeeId,
          priority: 'low'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  // ============================================
  // ATTENDANCE TESTS
  // ============================================
  describe('Attendance', () => {
    test('should get attendance records', async () => {
      const res = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ============================================
  // SALARY TESTS
  // ============================================
  describe('Salary Management', () => {
    test('founder can create salary record', async () => {
      const res = await request(app)
        .post('/api/salaries')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          userId: techEmployeeId,
          month: 'January',
          year: 2024,
          basicSalary: 50000,
          allowances: 5000,
          deductions: 2000
        });

      expect(res.statusCode).toBe(201);
    });

    test('employee cannot create salary', async () => {
      const res = await request(app)
        .post('/api/salaries')
        .set('Authorization', `Bearer ${techEmployeeToken}`)
        .send({
          userId: techEmployeeId,
          month: 'February',
          year: 2024,
          basicSalary: 50000
        });

      expect(res.statusCode).toBe(403);
    });

    test('tech head cannot create salary', async () => {
      const res = await request(app)
        .post('/api/salaries')
        .set('Authorization', `Bearer ${techHeadToken}`)
        .send({
          userId: techEmployeeId,
          month: 'March',
          year: 2024,
          basicSalary: 50000
        });

      expect(res.statusCode).toBe(403);
    });
  });
});
