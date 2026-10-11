require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const { assertSafeTestUri } = require('./testGuard');

function getFileTestUri(baseUri) {
  let suffix = 'test';
  try {
    const testPath = expect.getState().testPath;
    if (testPath) {
      suffix = path.basename(testPath).replace(/[^a-zA-Z0-9]/g, '_');
    }
  } catch (e) {}
  return baseUri.replace(/\/([^\/?]+)(\?|$)/, (m, db, q) => '/' + db + '_' + suffix + q);
}

beforeAll(async () => {
  const { MONGO_URI_TEST, MONGO_URI } = process.env;
  const fileUri = getFileTestUri(MONGO_URI_TEST);
  
  assertSafeTestUri(fileUri, MONGO_URI);

  await mongoose.connect(fileUri);
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
