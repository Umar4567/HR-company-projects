const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test users (optional)
    await User.deleteMany({ 
      $or: [
        { email: 'admin@hr.com' },
        { email: 'john@hr.com' }
      ] 
    });
    console.log('🗑️  Cleared existing test users');

    // Create test users with plain passwords (they will be hashed automatically)
    const testUsers = [
      {
        employeeId: 'ADM001',
        name: 'HR Admin',
        email: 'admin@hr.com',
        password: 'admin123', // This will be hashed by the pre-save hook
        department: 'HR',
        role: 'admin'
      },
      {
        employeeId: 'EMP001',
        name: 'John Employee',
        email: 'john@hr.com',
        password: 'password123', // This will be hashed by the pre-save hook
        department: 'IT',
        role: 'employee'
      }
    ];

    // Create users
    const createdUsers = await User.create(testUsers);
    
    console.log('✅ Test users created successfully:');
    createdUsers.forEach(user => {
      console.log(`📝 ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Password: ${testUsers.find(u => u.email === user.email).password}`);
      console.log(`   👤 Role: ${user.role}`);
      console.log(`   🏢 Department: ${user.department}`);
      console.log('---');
    });

    // Verify passwords work
    console.log('\n🔐 Verifying passwords...');
    for (const user of createdUsers) {
      const testPassword = testUsers.find(u => u.email === user.email).password;
      const isCorrect = await user.correctPassword(testPassword);
      console.log(`   ${user.email}: ${isCorrect ? '✅ Password works' : '❌ Password failed'}`);
    }

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📋 Database connection closed');
  }
};

createTestUsers();