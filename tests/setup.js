require('dotenv').config();
const mongoose = require('mongoose');
const { assertSafeTestUri } = require('./testGuard');

beforeAll(async () => {
  const { MONGO_URI_TEST, MONGO_URI } = process.env;
  
  assertSafeTestUri(MONGO_URI_TEST, MONGO_URI);

  await mongoose.connect(MONGO_URI_TEST);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});
