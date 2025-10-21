const express = require('express');
const {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  isHoliday,
  getUpcomingHolidays,
  addDefaultHolidays
} = require('../controllers/holidayController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/holidays - Get all holidays
router.get('/', getHolidays);

// GET /api/holidays/upcoming - Get upcoming holidays
router.get('/upcoming', getUpcomingHolidays);

// GET /api/holidays/check/:date - Check if date is holiday
router.get('/check/:date', isHoliday);

// POST /api/holidays - Create new holiday
router.post('/', createHoliday);

// POST /api/holidays/default - Add default holidays
router.post('/default', addDefaultHolidays);

// PUT /api/holidays/:id - Update holiday
router.put('/:id', updateHoliday);

// DELETE /api/holidays/:id - Delete holiday
router.delete('/:id', deleteHoliday);

module.exports = router;