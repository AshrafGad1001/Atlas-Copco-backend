
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");

const b5tests = `
  it("B5 engineer updating ignores region, rejects isDeleted, but admin can do both", async () => {
    const comp = await Company.create({ nameAr: "Test B5", region: engRegionId });
    
    // Engineer tries to change region
    let res = await request(app)
      .patch(\`/api/companies/\${comp._id}\`)
      .set("Cookie", [\`token=\${engToken}\`])
      .send({ nameAr: "Test B5 Updated", region: otherRegionId });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.region.toString()).toBe(engRegionId.toString()); // region ignored

    // Engineer tries to set isDeleted
    res = await request(app)
      .patch(\`/api/companies/\${comp._id}\`)
      .set("Cookie", [\`token=\${engToken}\`])
      .send({ isDeleted: true });
    expect(res.statusCode).toBe(403);

    // Engineer tries to delete
    res = await request(app)
      .delete(\`/api/companies/\${comp._id}\`)
      .set("Cookie", [\`token=\${engToken}\`]);
    expect(res.statusCode).toBe(403);

    // Admin tries to change region
    res = await request(app)
      .patch(\`/api/companies/\${comp._id}\`)
      .set("Cookie", [\`token=\${adminToken}\`])
      .send({ region: otherRegionId });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.region.toString()).toBe(otherRegionId.toString());

    // Admin tries to soft delete
    res = await request(app)
      .delete(\`/api/companies/\${comp._id}\`)
      .set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.statusCode).toBe(200);
    
    const checkDeleted = await Company.findById(comp._id);
    expect(checkDeleted.isDeleted).toBe(true);
  });
`;

t = t.replace(/afterEach\(async \(\) => \{/, b5tests + "\n  afterEach(async () => {");
fs.writeFileSync("tests/company.api.test.js", t);

