const User = require('../models/User');

// List users (admin only). Query params: status=pending|all
const listUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const { status } = req.query;
    const q = { role: 'employee' };
    if (status === 'pending') q.approved = false;

    const users = await User.find(q).select('_id employeeId name email department approved createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve a user by ID (admin only)
const approveUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.approved = true;
    await user.save();

    res.json({ message: 'User approved', userId: user._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listUsers, approveUser };
