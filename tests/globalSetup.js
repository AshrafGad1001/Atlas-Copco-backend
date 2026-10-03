
const mongoose = require("mongoose");
require("dotenv").config();
const { assertSafeTestUri } = require("./testGuard");

module.exports = async () => {
  assertSafeTestUri(process.env.MONGO_URI_TEST);
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
};

