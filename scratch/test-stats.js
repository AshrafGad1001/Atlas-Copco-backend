
const mongoose = require("mongoose");
const request = require("supertest");
const dotenv = require("dotenv");
const app = require("../app");
const User = require("../src/models/User");
const { connectDB } = require("../src/config/db");

dotenv.config();

const run = async () => {
  const uri = process.env.MONGO_URI_TEST;
  await mongoose.connect(uri);

  
let admin = await User.findOne({ role: "admin" });
if (!admin) admin = await User.create({ fullName: "Admin", username: "admin", email: "admin@test.com", password: "Password1", role: "admin" });

  const adminToken = require("jsonwebtoken").sign({ id: admin._id, tv: admin.tokenVersion }, process.env.JWT_SECRET, { expiresIn: "30d" });
  
  const eng = await User.findOne({ role: "engineer" });
  const engToken = require("jsonwebtoken").sign({ id: eng._id, tv: eng.tokenVersion }, process.env.JWT_SECRET, { expiresIn: "30d" });

  console.log("1. Admin /api/admin/stats/overview");
  let res = await request(app).get("/api/admin/stats/overview").set("Cookie", [`token=${adminToken}`]);
  console.log(res.status, res.body.data);

  console.log("\n2. Eng /api/admin/stats/overview -> 403");
  res = await request(app).get("/api/admin/stats/overview").set("Cookie", [`token=${engToken}`]);
  console.log(res.status);

  console.log("\n3. Admin /api/admin/stats/stale-companies?days=1000");
  res = await request(app).get("/api/admin/stats/stale-companies?days=1000").set("Cookie", [`token=${adminToken}`]);
  console.log(res.status, res.body.message);

  console.log("\n4. Eng /api/visits/mine/summary");
  res = await request(app).get("/api/visits/mine/summary").set("Cookie", [`token=${engToken}`]);
  console.log(res.status, res.body.data);

  process.exit(0);
};

run().catch(console.error);

