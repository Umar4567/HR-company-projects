const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['national', 'regional', 'company', 'optional'],
    default: 'national'
  },
  description: {
    type: String
  },
  recurring: {
    type: Boolean,
    default: false
  },
  year: {
    type: Number,
    default: new Date().getFullYear()
  }
}, {
  timestamps: true
});

// Index for efficient date queries
holidaySchema.index({ date: 1 });
holidaySchema.index({ year: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);