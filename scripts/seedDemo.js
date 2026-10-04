
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../src/config/db");
const Region = require("../src/models/Region");
const User = require("../src/models/User");
const Company = require("../src/models/Company");
const Visit = require("../src/models/Visit");

dotenv.config();

const run = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("تم تم تم ?? تم");
    process.exit(1);
  }

  await connectDB();
  const dbName = mongoose.connection.db.databaseName;
  const args = process.argv.slice(2);
  const confirmIdx = args.indexOf("--confirm");
  const confirmedDb = confirmIdx !== -1 ? args[confirmIdx + 1] : null;

  console.log(`Database Name: ${dbName}`);
  
  if (confirmedDb !== dbName) {
    console.error(`Please provide --confirm ${dbName}`);
    process.exit(1);
  }

  const isClear = args.includes("--clear");

  if (isClear) {
    console.log("Clearing DEMO data...");
    const visitsRes = await Visit.deleteMany({ notes: /DEMO_SEED/ });
    const companiesRes = await Company.deleteMany({ notes: "DEMO_SEED" });
    const engineersRes = await User.deleteMany({ username: /^demo\./ });
    const regionsRes = await Region.deleteMany({ name: /^DEMO / });
    console.log(`Deleted: ${regionsRes.deletedCount} regions, ${engineersRes.deletedCount} engineers, ${companiesRes.deletedCount} companies, ${visitsRes.deletedCount} visits.`);
    process.exit(0);
  }

  console.log("Seeding DEMO data...");

  // Seed Regions
  const regionsData = [
    { name: "DEMO \u0627\u0644\u0642\u0627\u0647\u0631\u0629" }, // تم
    { name: "DEMO \u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629" }, // تم
    { name: "DEMO \u0627\u0644\u062f\u0644\u062a\u0627" } // تم
  ];

  const regions = [];
  for (const r of regionsData) {
    let reg = await Region.findOne({ name: r.name });
    if (!reg) reg = await Region.create(r);
    regions.push(reg);
  }

  // Seed Engineers
  const password = process.env.DEMO_PASSWORD || "Demo12345";
  const engsData = [
    { username: "demo.eng1", fullName: "\u0645\u0647\u0646\u062f\u0633 \u062a\u062c\u0631\u064a\u0628\u064a 1", email: "eng1@demo.com", role: "engineer", isActive: true, region: regions[0]._id, phones: [{ number: "01000000001", isPrimary: true, label: "Work" }, { number: "01100000001", isPrimary: false, label: "Personal" }] },
    { username: "demo.eng2", fullName: "\u0645\u0647\u0646\u062f\u0633 \u062a\u062c\u0631\u064a\u0628\u064a 2", email: "eng2@demo.com", role: "engineer", isActive: true, region: regions[1]._id, phones: [{ number: "01000000002", isPrimary: true, label: "Work" }] },
    { username: "demo.eng3", fullName: "\u0645\u0647\u0646\u062f\u0633 \u062a\u062c\u0631\u064a\u0628\u064a 3", email: "eng3@demo.com", role: "engineer", isActive: true, region: regions[2]._id, phones: [{ number: "01000000003", isPrimary: true, label: "Work" }] },
    { username: "demo.eng4", fullName: "\u0645\u0647\u0646\u062f\u0633 \u0645\u0639\u0637\u0644 4", email: "eng4@demo.com", role: "engineer", isActive: false, region: regions[0]._id, phones: [{ number: "01000000004", isPrimary: true, label: "Work" }] }
  ];

  const engineers = [];
  for (const e of engsData) {
    let user = await User.findOne({ username: e.username });
    if (!user) user = await User.create({ ...e, password });
    engineers.push(user);
  }

  // Seed Companies
  const comps = [];
  for (let i = 1; i <= 12; i++) {
    const reg = regions[i % 3];
    const data = {
      nameAr: `\u0634\u0631\u0643\u0629 \u062a\u062c\u0631\u064a\u0628\u064a\u0629 ${i}`, // تم تم i
      nameEn: `Demo Company ${i}`,
      region: reg._id,
      notes: "DEMO_SEED",
      location: { address: "Address " + i }
    };
    let comp = await Company.findOne({ nameEn: data.nameEn, notes: "DEMO_SEED" });
    if (!comp) comp = await Company.create(data);
    comps.push(comp);
  }

  // Seed Visits
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  
  let visitsCount = 0;
  const visitChecks = await Visit.countDocuments({ notes: /DEMO_SEED/ });
  
  if (visitChecks === 0) {
    const visits = [];
    
    // Create ~60 visits
    // Companies 0-4: Active (visits in last 7 days)
    // Companies 5-9: Stale (last visit 30+ days ago)
    // Companies 10-11: Never visited
    
    // Active companies: multiple visits
    for (let i = 0; i <= 4; i++) {
      const comp = comps[i];
      const eng = engineers.find(e => e.region.toString() === comp.region.toString() && e.isActive) || engineers[0];
      
      // Visit today
      visits.push({
        company: comp._id, engineer: eng._id,
        visitDate: new Date(now), createdAt: new Date(now),
        type: "completed", notes: "DEMO_SEED Today",
        attendees: [{ name: "\u0623\u062d\u0645\u062f", jobTitle: "Mngr", phone: "0123456789" }]
      });
      // Visit 5 days ago
      visits.push({
        company: comp._id, engineer: eng._id,
        visitDate: new Date(now - 5 * DAY), createdAt: new Date(now - 5 * DAY),
        type: "planned", notes: "DEMO_SEED 5d ago",
        attendees: []
      });
      // Visit 15 days ago
      visits.push({
        company: comp._id, engineer: eng._id,
        visitDate: new Date(now - 15 * DAY), createdAt: new Date(now - 15 * DAY),
        type: "completed", notes: "DEMO_SEED 15d ago"
      });
    }

    // Stale companies: visits only 35+ days ago
    for (let i = 5; i <= 9; i++) {
      const comp = comps[i];
      const eng = engineers.find(e => e.region.toString() === comp.region.toString() && e.isActive) || engineers[0];
      
      visits.push({
        company: comp._id, engineer: eng._id,
        visitDate: new Date(now - 35 * DAY), createdAt: new Date(now - 35 * DAY),
        type: "completed", notes: "DEMO_SEED 35d ago"
      });
      visits.push({
        company: comp._id, engineer: eng._id,
        visitDate: new Date(now - 45 * DAY), createdAt: new Date(now - 45 * DAY),
        type: "cancelled", notes: "DEMO_SEED 45d ago"
      });
    }
    
    // Add 20 more random visits for the active ones inside the month
    for (let j = 0; j < 20; j++) {
      const comp = comps[j % 5];
      const eng = engineers.find(e => e.region.toString() === comp.region.toString() && e.isActive) || engineers[0];
      const offset = 2 + (j % 20); // 2 to 21 days ago
      visits.push({
        company: comp._id, engineer: eng._id,
        visitDate: new Date(now - offset * DAY), createdAt: new Date(now - offset * DAY),
        type: "completed", notes: `DEMO_SEED ${offset}d ago`,
        attendees: j % 2 === 0 ? [{ name: "\u0645\u062d\u0645\u062f" }] : []
      });
    }

    // Direct insert to bypass mongoose timestamps
    await Visit.collection.insertMany(visits);
    
    // Update companies lastVisitAt
    for (const c of comps) {
      const last = visits.filter(v => v.company === c._id && v.type === "completed").sort((a,b) => b.visitDate - a.visitDate)[0];
      if (last) {
        await Company.updateOne({ _id: c._id }, { $set: { lastVisitAt: last.visitDate } });
      }
    }
    visitsCount = visits.length;
  }

  console.log(`Seeding Done. Regions: ${regions.length}, Engineers: ${engineers.length}, Companies: ${comps.length}, New Visits: ${visitsCount}`);
  console.log(`DEMO_PASSWORD: ${password}`);
  process.exit(0);
};

run().catch(console.error);

