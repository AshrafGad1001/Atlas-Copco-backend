require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined');
    }
    await mongoose.connect(process.env.MONGO_URI);
    
    const adminExists = await User.findOne({ username: process.env.ADMIN_USERNAME });
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    const adminUser = new User({
      fullName: process.env.ADMIN_FULL_NAME,
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      role: 'admin',
      password: process.env.ADMIN_PASSWORD,
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
