const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Holiday = require('../models/Holiday');

// Add this function to check if date is holiday
// Accepts a Date or date-string; does NOT mutate the input.
const checkIfHoliday = async (dateInput) => {
  const d = new Date(dateInput);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);

  const holiday = await Holiday.findOne({
    date: {
      $gte: start,
      $lte: end
    }
  });

  return holiday;
};

// Check-in function
const checkIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is holiday
    const isHoliday = await checkIfHoliday(new Date());
    if (isHoliday) {
      return res.status(400).json({ 
        message: `Cannot check in on holiday: ${isHoliday.name}` 
      });
    }

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.user.id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        message: 'Already checked in for today' 
      });
    }

    // Read location payload
    const location = req.body.location || {};
    const latitude = location.latitude || req.body.latitude;
    const longitude = location.longitude || req.body.longitude;
    const locationName = location.name || req.body.locationName || req.body.address;

    const attendance = await Attendance.create({
      employee: req.user.id,
      name: req.user.name,
      checkIn: new Date(),
      date: today,
      status: 'present',
      // store both legacy and check-in specific fields
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      locationName: locationName || undefined,
      checkInLatitude: latitude ? parseFloat(latitude) : undefined,
      checkInLongitude: longitude ? parseFloat(longitude) : undefined,
      checkInLocationName: locationName || undefined
    });

    // ensure manual checkins are not marked as auto-checked-out
    attendance.autoCheckedOut = false;
    await attendance.save();

    await attendance.populate('employee', 'name employeeId department');

    res.status(201).json({
      message: 'Checked in successfully',
      attendance
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Check-out function
const checkOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: req.user.id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance) {
      return res.status(400).json({ 
        message: 'Please check in first' 
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ 
        message: 'Already checked out for today' 
      });
    }

    const checkOutTime = new Date();
  attendance.checkOut = checkOutTime;
  // Ensure name is set (in case migrated records or missing)
  if (!attendance.name) attendance.name = req.user.name;
    // Save precise location if provided
    // Accept either { location: { latitude, longitude, name } } or flat fields
    try {
      const location = req.body.location || {};
      const lat = location.latitude || req.body.latitude;
      const lng = location.longitude || req.body.longitude;
      const locName = location.name || req.body.locationName || req.body.address;

      // preserve legacy fields as well as set check-out specific fields
      if (lat) {
        // lat => latitude
        attendance.latitude = attendance.latitude || parseFloat(lat);
        attendance.checkOutLatitude = parseFloat(lat);
      }
      if (lng) {
        // lng => longitude
        attendance.longitude = attendance.longitude || parseFloat(lng);
        attendance.checkOutLongitude = parseFloat(lng);
      }
      if (locName) {
        attendance.locationName = attendance.locationName || locName;
        attendance.checkOutLocationName = locName;
      }
    } catch (e) {
      // ignore location parsing errors
      console.error('Location parsing error:', e);
    }
    let hoursWorked = (checkOutTime - attendance.checkIn) / (1000 * 60 * 60);
    
    if (hoursWorked > 5) {
      hoursWorked -= 1;
    }
    
    attendance.hoursWorked = parseFloat(hoursWorked.toFixed(2));
    
    if (hoursWorked >= 4) {
      attendance.status = 'present';
    } else if (hoursWorked > 0) {
      attendance.status = 'half-day';
    } else {
      attendance.status = 'absent';
    }

    // Manual checkout: ensure autoCheckedOut is false
    attendance.autoCheckedOut = false;

    await attendance.save();
    await attendance.populate('employee', 'name employeeId department');

    res.json({
      message: 'Checked out successfully',
      attendance
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get my attendance function
const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { employee: req.user.id };
    
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          query.date.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          query.date.$lte = e;
        }
      }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('employee', 'name employeeId department');

    const enhancedAttendance = await Promise.all(
      attendance.map(async (record) => {
        const holiday = await checkIfHoliday(new Date(record.date));
        const attendanceDate = new Date(record.date);
        const today = new Date();
        
        let finalStatus = record.status;
        if (attendanceDate.toDateString() === today.toDateString() && !record.checkIn && !holiday) {
          finalStatus = 'absent';
        }
        
        if (holiday) {
          finalStatus = 'holiday';
        }

        return {
          ...record.toObject(),
          status: finalStatus,
          isHoliday: !!holiday,
          holidayName: holiday ? holiday.name : null
        };
      })
    );

    res.json(enhancedAttendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all attendance function - FIXED to show ALL employees
const getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, department, employeeId, name } = req.query;
    
    // Get all employees first based on filters
    let employeeQuery = { role: 'employee' };
    
    if (department && department !== 'all') {
      employeeQuery.department = department;
    }

    if (employeeId && employeeId !== 'all') {
      employeeQuery.employeeId = employeeId;
    }

    // If name filter provided, do a case-insensitive partial match on employee name
    if (name && String(name).trim() !== '') {
      employeeQuery.name = { $regex: String(name).trim(), $options: 'i' };
    }

    const allEmployees = await User.find(employeeQuery).select('_id name employeeId department');

    // If no date range specified, show today's data
    const targetStartDate = startDate ? new Date(startDate) : new Date();
    const targetEndDate = endDate ? new Date(endDate) : new Date();
    
    targetStartDate.setHours(0, 0, 0, 0);
    targetEndDate.setHours(23, 59, 59, 999);

    // Get attendance records for the date range
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: targetStartDate,
        $lte: targetEndDate
      }
    })
    .populate('employee', 'name employeeId department')
    .sort({ date: -1 });

    // Create enhanced attendance data that includes ALL employees
    const enhancedAttendance = await Promise.all(
      allEmployees.map(async (employee) => {
        // Find attendance records for this employee in the date range
        const employeeAttendance = attendanceRecords.filter(record => 
          record.employee && record.employee._id.toString() === employee._id.toString()
        );

        // If date range is selected
        if (startDate && endDate && startDate !== endDate) {
          if (employeeAttendance.length > 0) {
            return await Promise.all(
              employeeAttendance.map(async (record) => {
                const holiday = await checkIfHoliday(new Date(record.date));
                return {
                  ...record.toObject(),
                  isHoliday: !!holiday,
                  holidayName: holiday ? holiday.name : null
                };
              })
            );
          } else {
            // No attendance records - create virtual records for each day
            const dateRangeRecords = [];
            const currentDate = new Date(targetStartDate);
            
            while (currentDate <= targetEndDate) {
              const holiday = await checkIfHoliday(new Date(currentDate));
              dateRangeRecords.push({
                _id: `virtual-${employee._id}-${currentDate.getTime()}`,
                employee: employee,
                date: new Date(currentDate),
                checkIn: null,
                checkOut: null,
                hoursWorked: 0,
                status: holiday ? 'holiday' : 'absent',
                isHoliday: !!holiday,
                holidayName: holiday ? holiday.name : null,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return dateRangeRecords;
          }
        } else {
          // Single date or today
          if (employeeAttendance.length > 0) {
            const record = employeeAttendance[0];
            const holiday = await checkIfHoliday(new Date(record.date));
            return {
              ...record.toObject(),
              isHoliday: !!holiday,
              holidayName: holiday ? holiday.name : null
            };
          } else {
            // No attendance record - create virtual record
            const targetDate = startDate ? new Date(startDate) : new Date();
            const holiday = await checkIfHoliday(new Date(targetDate));
            
            return {
              _id: `virtual-${employee._id}-${targetDate.getTime()}`,
              employee: employee,
              date: targetDate,
              checkIn: null,
              checkOut: null,
              hoursWorked: 0,
              status: holiday ? 'holiday' : 'absent',
              isHoliday: !!holiday,
              holidayName: holiday ? holiday.name : null,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }
        }
      })
    );

    // Flatten the array
    const flattenedAttendance = enhancedAttendance.flat();

    res.json(flattenedAttendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Dashboard stats function - FIXED for HR
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const isTodayHoliday = await checkIfHoliday(new Date(today));
    
    if (req.user.role === 'admin') {
      const totalEmployees = await User.countDocuments({ role: 'employee' });
      const totalDepartments = await User.distinct('department');
      
      today.setHours(0, 0, 0, 0);
      
      const todayAttendance = await Attendance.find({
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }).populate('employee', 'name employeeId department');

      const allEmployees = await User.find({ role: 'employee' }).select('_id name employeeId department');
      
      const presentToday = todayAttendance.filter(a => 
        a.checkIn && (a.status === 'present' || a.status === 'half-day')
      ).length;
      
      const absentToday = isTodayHoliday ? 0 : (totalEmployees - presentToday);

      const allEmployeesAttendance = await Promise.all(
        allEmployees.map(async (employee) => {
          const attendanceRecord = todayAttendance.find(a => 
            a.employee && a.employee._id.toString() === employee._id.toString()
          );
          
          if (attendanceRecord) {
            const holiday = await checkIfHoliday(new Date(attendanceRecord.date));
            return {
              ...attendanceRecord.toObject(),
              isHoliday: !!holiday,
              holidayName: holiday ? holiday.name : null
            };
          } else {
            const holiday = await checkIfHoliday(today);
            return {
              _id: `virtual-${employee._id}`,
              employee: employee,
              date: today,
              checkIn: null,
              checkOut: null,
              hoursWorked: 0,
              status: holiday ? 'holiday' : 'absent',
              isHoliday: !!holiday,
              holidayName: holiday ? holiday.name : null,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }
        })
      );

      const upcomingHolidays = await Holiday.find({
        date: { $gte: today }
      })
      .sort({ date: 1 })
      .limit(3);

      res.json({
        role: 'hr',
        totalEmployees,
        totalDepartments: totalDepartments.length,
        presentToday,
        absentToday,
        todayAttendance: allEmployeesAttendance,
        isTodayHoliday,
        todayHoliday: isTodayHoliday,
        upcomingHolidays
      });
    } else {
      today.setHours(0, 0, 0, 0);

      const todayAttendance = await Attendance.findOne({
        employee: req.user.id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }).populate('employee', 'name employeeId department');

      let todayStatus = 'absent';
      if (isTodayHoliday) {
        todayStatus = 'holiday';
      } else if (todayAttendance) {
        if (todayAttendance.checkIn && !todayAttendance.checkOut) {
          todayStatus = 'present';
        } else if (todayAttendance.checkIn && todayAttendance.checkOut) {
          todayStatus = todayAttendance.status;
        }
      }

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyAttendance = await Attendance.find({
        employee: req.user.id,
        date: { $gte: startOfMonth }
      });

      const workingDays = monthlyAttendance.filter(a => 
        a.status === 'present' || a.status === 'half-day'
      ).length;
      const totalHours = monthlyAttendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);

      const upcomingHolidays = await Holiday.find({
        date: { $gte: today }
      })
      .sort({ date: 1 })
      .limit(3);

      res.json({
        role: 'employee',
        todayAttendance,
        todayStatus,
        workingDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        employee: req.user,
        isTodayHoliday,
        todayHoliday: isTodayHoliday,
        upcomingHolidays
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Export all functions
module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getDashboardStats
};

// Automatic checkout helper - finds check-ins older than thresholdHours and checks them out
// This is safe to call periodically from server startup.
const autoCheckoutOverdue = async (thresholdHours = 8) => {
  try {
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    // Find attendances that have checkIn set, no checkOut, and checkIn older than cutoff
    const overdue = await Attendance.find({
      checkIn: { $exists: true, $ne: null, $lte: cutoff },
      checkOut: { $exists: false }
    });

    for (const rec of overdue) {
      try {
        const checkOutTime = new Date(rec.checkIn.getTime() + thresholdHours * 60 * 60 * 1000);
        rec.checkOut = checkOutTime;

        let hoursWorked = (rec.checkOut - rec.checkIn) / (1000 * 60 * 60);
        if (hoursWorked > 5) hoursWorked -= 1; // lunch deduction as in checkout
        rec.hoursWorked = parseFloat(hoursWorked.toFixed(2));

        if (hoursWorked >= 4) rec.status = 'present';
        else if (hoursWorked > 0) rec.status = 'half-day';
        else rec.status = 'absent';

        // mark checkout location as automated
  rec.checkOutLocationName = rec.checkOutLocationName || 'Auto-checked-out';
  rec.autoCheckedOut = true;

        await rec.save();
        console.log(`Auto-checked-out attendance ${rec._id} for employee ${rec.employee}`);
      } catch (e) {
        console.error('Auto-checkout failed for record', rec._id, e.message);
      }
    }
  } catch (error) {
    console.error('Error running autoCheckoutOverdue:', error.message);
  }
};

// Export helper for server to call
module.exports.autoCheckoutOverdue = autoCheckoutOverdue;