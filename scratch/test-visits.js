
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
const User = require("../src/models/User");
const Region = require("../src/models/Region");
const Company = require("../src/models/Company");
const Visit = require("../src/models/Visit");
require("dotenv").config({ path: ".env" });

async function run() {
  console.log(process.env.MONGO_URI_TEST);
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.db.dropDatabase();

  const reg1 = await Region.create({ name: "R1" });
  const reg2 = await Region.create({ name: "R2" });
  const admin = await User.create({ fullName: "Admin", username: "admin", email: "a@a.com", password: "password123", role: "admin" });
  const eng1 = await User.create({ fullName: "Eng1", username: "eng1", email: "e1@a.com", password: "password123", role: "engineer", region: reg1._id, phones: [{ number: "01011111111" }] });
  const eng2 = await User.create({ fullName: "Eng2", username: "eng2", email: "e2@a.com", password: "password123", role: "engineer", region: reg2._id, phones: [{ number: "01022222222" }] });
  const comp = await Company.create({ nameAr: "C1", region: reg1._id });

  let res = await request(app).post("/api/auth/login").send({ username: "eng1", password: "password123" });
  const eng1Token = res.headers["set-cookie"][0].split(";")[0].split("=")[1];

  res = await request(app).post("/api/auth/login").send({ username: "admin", password: "password123" });
  const adminToken = res.headers["set-cookie"][0].split(";")[0].split("=")[1];

  res = await request(app).post("/api/auth/login").send({ username: "eng2", password: "password123" });
  const eng2Token = res.headers["set-cookie"][0].split(";")[0].split("=")[1];

  console.log("Create Visit (eng1)");
  res = await request(app).post("/api/visits").set("Cookie", [`token=${eng1Token}`]).send({ company: comp._id, notes: "v1" });
  console.log(res.status);
  const visitId = res.body.data._id;

  console.log("Update within limit (eng1) -> 200");
  res = await request(app).patch(`/api/visits/${visitId}`).set("Cookie", [`token=${eng1Token}`]).send({ notes: "v1 updated" });
  console.log(res.status);
  
  console.log("Update another eng (eng2) -> 403");
  res = await request(app).patch(`/api/visits/${visitId}`).set("Cookie", [`token=${eng2Token}`]).send({ notes: "v1 updated" });
  console.log(res.status);
  
  console.log("Future date -> 400");
  res = await request(app).patch(`/api/visits/${visitId}`).set("Cookie", [`token=${eng1Token}`]).send({ visitDate: new Date(Date.now() + 1000000000) });
  console.log(res.status);
  
  // mock old createdAt
  await Visit.collection.updateOne({ _id: new mongoose.Types.ObjectId(visitId) }, { $set: { createdAt: new Date(Date.now() - 25 * 3600000) } });
  
  console.log("Update after 24h (eng1) -> 403");
  res = await request(app).patch(`/api/visits/${visitId}`).set("Cookie", [`token=${eng1Token}`]).send({ notes: "too late" });
  console.log(res.status);

  console.log("Update after 24h (admin) -> 200");
  res = await request(app).patch(`/api/visits/${visitId}`).set("Cookie", [`token=${adminToken}`]).send({ notes: "admin edit" });
  console.log(res.status);
  
  console.log("Check editHistory in admin response");
  console.log(res.body.data.editHistory.length > 0 ? "YES" : "NO");

  console.log("Delete (admin)");
  res = await request(app).delete(`/api/visits/${visitId}`).set("Cookie", [`token=${adminToken}`]);
  console.log(res.status);
  
  console.log("Check if deleted from /visits/mine");
  res = await request(app).get("/api/visits/mine").set("Cookie", [`token=${eng1Token}`]);
  console.log(res.status, res.body);

  await mongoose.disconnect();
}
run();

