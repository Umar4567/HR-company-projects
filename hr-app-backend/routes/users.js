const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { listUsers, approveUser } = require('../controllers/usersController');

// GET /api/users?status=pending
router.get('/', protect, listUsers);

// PUT /api/users/:id/approve
router.put('/:id/approve', protect, approveUser);

module.exports = router;
