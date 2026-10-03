
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");

const b6tests = `
  it("B6 merge transfers visits, fills missing fields, and deletes sources", async () => {
    const target = await Company.create({ nameAr: "Target", region: engRegionId });
    const source1 = await Company.create({ nameAr: "Source 1", nameEn: "S1", address: "Addr 1", region: engRegionId });
    const source2 = await Company.create({ nameAr: "Source 2", industry: "Ind 2", region: engRegionId });
    
    const Visit = require("../src/models/Visit");
    await Visit.create({ company: source1._id, visitDate: new Date(), type: "sales", nextStep: "nothing", engineer: engToken ? (await User.findOne({username: "eng"}))._id : null });
    
    const res = await request(app)
      .post(\`/api/admin/companies/\${target._id}/merge\`)
      .set("Cookie", [\`token=\${adminToken}\`])
      .send({ sourceIds: [source1._id, source2._id] });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.data.nameEn).toBe("S1");
    expect(res.body.data.address).toBe("Addr 1");
    expect(res.body.data.industry).toBe("Ind 2");

    const checkS1 = await Company.findById(source1._id);
    expect(checkS1.isDeleted).toBe(true);

    const visits = await Visit.find({ company: target._id });
    expect(visits.length).toBe(1);
  });
`;

t = t.replace(/afterEach\(async \(\) => \{/, b6tests + "\n  afterEach(async () => {");
fs.writeFileSync("tests/company.api.test.js", t);

