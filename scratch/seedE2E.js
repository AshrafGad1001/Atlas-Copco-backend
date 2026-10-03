require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Region = require('./src/models/Region');
const connectDB = require('./src/config/db');
const { assertSafeTestUri } = require('./tests/testGuard');

const seed = async () => {
  process.env.NODE_ENV = 'test';
  
  // Guard
  assertSafeTestUri(process.env.MONGO_URI_TEST, process.env.MONGO_URI);

  await connectDB();
  
  // Clean DB
  await User.deleteMany();
  await Region.deleteMany();
  
  const admin = await User.create({
    fullName: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin12345',
    role: 'admin',
    isActive: true
  });
  
  const region = await Region.create({
    name: 'Cairo',
    isActive: true
  });
  
  const engineer = await User.create({
    fullName: 'Eng Ashraf',
    username: 'ashraf123',
    email: 'ashraf@example.com',
    password: 'password@123',
    role: 'engineer',
    region: region._id,
    isActive: true,
    phones: [{ number: '01012345678', isPrimary: true }]
  });
  
  console.log('Test DB Seeded!');
  process.exit(0);
};

seed();
