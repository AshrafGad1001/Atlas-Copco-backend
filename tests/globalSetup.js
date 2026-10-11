
const mongoose = require("mongoose");
require("dotenv").config();
const { assertSafeTestUri } = require("./testGuard");

module.exports = async () => {
  assertSafeTestUri(process.env.MONGO_URI_TEST);
  try {
    await mongoose.connect(process.env.MONGO_URI_TEST, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  } catch (err) {
    // Isolated per-file databases handle their own drops
  }
};

