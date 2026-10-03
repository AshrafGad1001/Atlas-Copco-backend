
    const mongoose = require("mongoose");
    const User = require("../src/models/User");
    const Region = require("../src/models/Region");
    mongoose.connect(process.env.MONGO_URI_TEST).then(async () => {
      await mongoose.connection.db.dropDatabase();
      const reg1 = await Region.create({ name: "Region 1" });
      const reg2 = await Region.create({ name: "Region 2" });
      await User.create({ fullName: "Admin User", username: "admin", email: "admin@t.com", password: "Admin12345", role: "admin", phones: [{number: "01000000000"}] });
      await User.create({ fullName: "Eng One", username: "ashraf123", email: "eng1@t.com", password: "password@123", role: "engineer", region: reg1._id, phones: [{number: "01011111111"}] });
      await User.create({ fullName: "Visit Eng", username: "visitEng", email: "veng@t.com", password: "password@123", role: "engineer", region: reg1._id, phones: [{number: "01011111112"}] });
      await User.create({ fullName: "Eng Two", username: "eng2", email: "eng2@t.com", password: "password@123", role: "engineer", region: reg2._id, phones: [{number: "01022222222"}] });
      const Company = require("../src/models/Company");
      await Company.create({ name: "Test Company 1", region: reg1._id, phone: "01000000000", isClient: true });
      console.log("Seeded");
      process.exit(0);
    });
  