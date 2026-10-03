const mongoose = require('mongoose');
const Company = require('../src/models/Company');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const companies = await Company.find({});
    for (const c of companies) {
      if (c.nameAr) c.nameArNorm = require('../src/utils/normalizeName')(c.nameAr);
      if (c.nameEn) c.nameEnNorm = require('../src/utils/normalizeName')(c.nameEn);
      await c.save();
    }
    console.log(`Updated ${companies.length} companies.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
run();
