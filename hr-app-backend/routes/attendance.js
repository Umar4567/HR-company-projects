const express = require('express');
const { 
  checkIn, 
  checkOut, 
  getMyAttendance,
  getAllAttendance,
  getDashboardStats
} = require('../controllers/attendanceController');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/attendance/checkin
router.post('/checkin', auth, checkIn);

// POST /api/attendance/checkout
router.post('/checkout', auth, checkOut);

// GET /api/attendance/my-attendance
router.get('/my-attendance', auth, getMyAttendance);

// GET /api/attendance/all
router.get('/all', auth, getAllAttendance);

// GET /api/attendance/dashboard-stats
router.get('/dashboard-stats', auth, getDashboardStats);

module.exports = router;