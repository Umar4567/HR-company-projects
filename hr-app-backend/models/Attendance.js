const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  // store employee name redundantly to simplify queries and frontend display
  name: {
    type: String
  },

  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // precise GPS coordinates and optional human-readable location
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  locationName: {
    type: String
  },
  // Separate check-in/check-out locations to preserve both
  checkInLatitude: { type: Number },
  checkInLongitude: { type: Number },
  checkInLocationName: { type: String },
  checkOutLatitude: { type: Number },
  checkOutLongitude: { type: Number },
  checkOutLocationName: { type: String },
  checkIn: {
    type: Date,
    required: true
  },
  // store employee name redundantly to simplify queries and frontend display
  name: {
    type: String
  },
  checkOut: {
    type: Date
  },
  hoursWorked: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  }
}, {
  timestamps: true
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);