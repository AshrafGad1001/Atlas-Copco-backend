require('dotenv').config();
const mongoose = require('mongoose');

beforeAll(async () => {
  const { MONGO_URI_TEST, MONGO_URI } = process.env;

  if (!MONGO_URI_TEST) {
    throw new Error('MONGO_URI_TEST is not defined in .env');
  }

  if (MONGO_URI_TEST === MONGO_URI) {
    throw new Error('MONGO_URI_TEST must be different from MONGO_URI to prevent data loss');
  }

  if (!MONGO_URI_TEST.toLowerCase().includes('test')) {
    throw new Error('MONGO_URI_TEST must contain the word "test" in the database name');
  }

  await mongoose.connect(MONGO_URI_TEST);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
});
