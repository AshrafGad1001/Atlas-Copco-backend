
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");

const b3tests = `
  it("B3 search handles Arabic variations and regex escapes", async () => {
    await Company.create({ nameAr: "\\u0623\\u062d\\u0645\\u062f \\u0645\\u0635\\u0646\\u0639", region: engRegionId }); // ???? ????
    await Company.create({ nameAr: "\\u0645\\u062f\\u064a\\u0646\\u0640\\u0640\\u0629 (Test)", region: engRegionId }); // ??????? (Test)
    await Company.create({ nameEn: "Global Factory", region: engRegionId });
    await Company.create({ nameAr: "\\u0645\\u062d\\u0630\\u0648\\u0641", region: engRegionId, isDeleted: true }); // ?????
    await Company.create({ nameAr: "\\u0623\\u062d\\u0645\\u062f \\u0645\\u0646\\u0637\\u0642\\u0629 \\u062a\\u0627\\u0646\\u064a\\u0629", region: otherRegionId }); // ???? ????? ?????
    
    // search ????
    let res = await request(app).get("/api/companies?search=" + encodeURIComponent("\\u0627\\u062d\\u0645\\u062f")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(2);
    
    // search ????
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("\\u0645\\u0635\\u0646\\u0639")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(1);

    // search english case insensitive
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("GLOBAL factory")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(1);

    // search regex chars
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("( [ * ")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.statusCode).toBe(200);

    // engineer isolation
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("\\u0627\\u062d\\u0645\\u062f")).set("Cookie", [\`token=\${engToken}\`]);
    expect(res.body.data.length).toBe(1); // engineer sees 1, admin sees 2
    
    // deleted hidden
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("\\u0645\\u062d\\u0630\\u0648\\u0641")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(0);
  });
`;

t = t.replace(/it\("B3 search handles Arabic variations and regex escapes", async \(\) => \{[\s\S]*?\}\);/, b3tests.trim());
fs.writeFileSync("tests/company.api.test.js", t);

