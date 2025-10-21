const Holiday = require('../models/Holiday');

// Get all holidays
exports.getHolidays = async (req, res) => {
  try {
    const { year, month, type } = req.query;
    
    let query = {};
    
    if (year) {
      query.year = parseInt(year);
    }
    
    if (month) {
      const startDate = new Date(year || new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    
    res.json(holidays);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Create new holiday
exports.createHoliday = async (req, res) => {
  try {
    const { name, date, type, description, recurring } = req.body;
    
    const holiday = await Holiday.create({
      name,
      date: new Date(date),
      type,
      description,
      recurring,
      year: new Date(date).getFullYear()
    });
    
    res.status(201).json(holiday);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Holiday already exists for this date' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, type, description, recurring } = req.body;
    
    const holiday = await Holiday.findByIdAndUpdate(
      id,
      {
        name,
        date: date ? new Date(date) : undefined,
        type,
        description,
        recurring,
        year: date ? new Date(date).getFullYear() : undefined
      },
      { new: true, runValidators: true }
    );
    
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    
    res.json(holiday);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findByIdAndDelete(id);
    
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }
    
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Check if date is holiday
exports.isHoliday = async (req, res) => {
  try {
    const { date } = req.params;
    
    const holiday = await Holiday.findOne({ 
      date: {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lte: new Date(date + 'T23:59:59.999Z')
      }
    });
    
    res.json({ 
      isHoliday: !!holiday,
      holiday: holiday || null
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get upcoming holidays
exports.getUpcomingHolidays = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const upcomingHolidays = await Holiday.find({
      date: { $gte: new Date() }
    })
    .sort({ date: 1 })
    .limit(parseInt(limit));
    
    res.json(upcomingHolidays);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add default holidays for current year
exports.addDefaultHolidays = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Check if holidays already exist for this year
    const existingHolidays = await Holiday.countDocuments({ year: currentYear });
    if (existingHolidays > 0) {
      return res.status(400).json({ 
        message: 'Holidays already exist for this year' 
      });
    }
    
    const defaultHolidays = [
      {
        name: 'New Year',
        date: new Date(currentYear, 0, 1),
        type: 'national',
        description: 'New Year Day',
        recurring: true
      },
      {
        name: 'Republic Day',
        date: new Date(currentYear, 0, 26),
        type: 'national',
        description: 'Republic Day of India',
        recurring: true
      },
      {
        name: 'Holi',
        date: new Date(currentYear, 2, 25), // Example date
        type: 'national',
        description: 'Festival of Colors',
        recurring: true
      },
      {
        name: 'Independence Day',
        date: new Date(currentYear, 7, 15),
        type: 'national',
        description: 'Independence Day of India',
        recurring: true
      },
      {
        name: 'Gandhi Jayanti',
        date: new Date(currentYear, 9, 2),
        type: 'national',
        description: 'Birthday of Mahatma Gandhi',
        recurring: true
      },
      {
        name: 'Diwali',
        date: new Date(currentYear, 10, 12), // Example date
        type: 'national',
        description: 'Festival of Lights',
        recurring: true
      },
      {
        name: 'Christmas',
        date: new Date(currentYear, 11, 25),
        type: 'national',
        description: 'Christmas Day',
        recurring: true
      }
    ];
    
    const holidays = await Holiday.insertMany(defaultHolidays);
    
    res.status(201).json({
      message: 'Default holidays added successfully',
      count: holidays.length,
      holidays
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};