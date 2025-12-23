// backend/src/routes/salaryRoutes.js

const express = require('express');
const router = express.Router();
const {
    getSalaries,
    getMySalary,
    getSalary,
    createSalary,
    updateSalary,
    deleteSalary
} = require('../controllers/salaryController');
const { protect } = require('../middleware/auth');

router.use(protect);

// My salary route (for employees) - must be before /:id route
router.get('/my-salary', getMySalary);

router.route('/')
    .get(getSalaries)
    .post(createSalary);

router.route('/:id')
    .get(getSalary)
    .put(updateSalary)
    .delete(deleteSalary);

module.exports = router;
