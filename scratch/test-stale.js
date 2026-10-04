require('dotenv').config();
const mongoose = require("mongoose");
const Company = require("../src/models/Company");
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const comps = await Company.find({ isDeleted: { $ne: true } })
    .sort("lastVisitAt")
    .limit(2)
    .populate("region", "name");
  console.log(JSON.stringify(comps, null, 2));
  process.exit(0);
});
