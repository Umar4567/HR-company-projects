// Quick local check for date parsing functions
const hc = require('./controllers/holidayController');
const ac = require('./controllers/attendanceController');

console.log('Testing parse of holidayController month range and isHoliday parsing...');

try {
  // simulate calling getHolidays helper logic by creating dates
  const month = 10; // October
  const year = 2025;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  startDate.setHours(0,0,0,0);
  endDate.setHours(23,59,59,999);
  console.log('Month start:', startDate.toString());
  console.log('Month end:  ', endDate.toString());

  // test attendance checkIfHoliday non-mutating
  const d = new Date('2025-10-17T12:00:00');
  const before = new Date(d);
  ac.checkIfHoliday(before).then(r => console.log('checkIfHoliday returned (may be null if DB not connected):', r)).catch(e => console.error('checkIfHoliday error:', e.message));
  console.log('Original date after call (should be unchanged):', d.toString());
} catch (err) {
  console.error('Test script error:', err.message);
}
