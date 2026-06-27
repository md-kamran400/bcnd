// migrate-passwords.js
const { sequelize } = require('../database');
const User = require('../models/User');
const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const users = await User.findAll();
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\nChecking user: ${user.email}`);
      console.log(`Current hash type: ${user.passwordHash.substring(0, 10)}`);
      
      // If it's an Argon2 hash, convert to bcrypt
      if (user.passwordHash.startsWith('$argon2')) {
        console.log('Argon2 hash detected, attempting to convert...');
        
        // Since we don't know the original password, we need to:
        // Option 1: Skip - users will need to reset their passwords
        // Option 2: Set a temporary password and force reset
        
        console.log('Skipping migration - users should reset their passwords');
        console.log(`User ${user.email} needs to use forgot password`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// migratePasswords();

// Alternative: Create a test user with bcrypt for testing
async function createBcryptUser() {
  try {
    await sequelize.authenticate();
    
    const password = 'password123';
    const bcryptHash = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      name: 'Bcrypt Test User',
      email: 'bcrypt@test.com',
      employeeId: 'BCRYPT001',
      passwordHash: bcryptHash,
      role: 'Employee'
    });
    
    console.log('Bcrypt test user created:', user.email);
    console.log('Password:', password);
    console.log('Hash:', bcryptHash);
    
    // Verify it works
    const verify = await user.comparePassword(password);
    console.log('Verification test:', verify ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run this to create a test user with bcrypt
createBcryptUser();