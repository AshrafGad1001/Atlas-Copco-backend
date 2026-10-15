require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const { assertSafeTestUri } = require('./testGuard');

const crypto = require('crypto');

function getFileTestUri(baseUri) {
  let hash = 'def';
  try {
    const testPath = expect.getState().testPath;
    if (testPath) {
      hash = crypto.createHash('md5').update(path.basename(testPath)).digest('hex').substring(0, 8);
    }
  } catch (e) {}
  return baseUri.replace(/\/([^\/?]+)(\?|$)/, (m, db, q) => '/' + db + '_' + hash + q);
}

beforeAll(async () => {
  const { MONGO_URI_TEST, MONGO_URI } = process.env;
  const fileUri = getFileTestUri(MONGO_URI_TEST);
  
  assertSafeTestUri(fileUri, MONGO_URI);

  await mongoose.connect(fileUri, { serverSelectionTimeoutMS: 30000 });
}, 60000);

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
