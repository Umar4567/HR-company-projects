const fs = require('fs');
const path = require('path');

console.log('🔍 Checking required files...');

const requiredFiles = [
  'server.js',
  '.env',
  'routes/auth.js',
  'routes/attendance.js',
  'controllers/authController.js',
  'controllers/attendanceController.js',
  'models/User.js',
  'models/Attendance.js',
  'middleware/auth.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('\n🎉 All files are present!');
  console.log('Try running: npm run dev');
} else {
  console.log('\n⚠️ Some files are missing. Please create them first.');
}
console.log('Setup check complete.');