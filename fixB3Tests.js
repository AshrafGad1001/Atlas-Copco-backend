
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");

const b3tests = `
  it("B3 search handles Arabic variations and regex escapes", async () => {
    await Company.create({ nameAr: "???? ????", region: engRegionId });
    await Company.create({ nameAr: "??????? (Test)", region: engRegionId });
    await Company.create({ nameEn: "Global Factory", region: engRegionId });
    await Company.create({ nameAr: "?????", region: engRegionId, isDeleted: true });
    await Company.create({ nameAr: "???? ????? ?????", region: otherRegionId });
    
    // search ????
    let res = await request(app).get("/api/companies?search=" + encodeURIComponent("????")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(2);
    
    // search ??????
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("????")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(1);

    // search english case insensitive
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("GLOBAL factory")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(1);

    // search regex chars
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("( [ * ")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.statusCode).toBe(200);

    // engineer isolation
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("????")).set("Cookie", [\`token=\${engToken}\`]);
    expect(res.body.data.length).toBe(1); // engineer sees 1, admin sees 2
    
    // deleted hidden
    res = await request(app).get("/api/companies?search=" + encodeURIComponent("?????")).set("Cookie", [\`token=\${adminToken}\`]);
    expect(res.body.data.length).toBe(0);
  });
`;

t = t.replace(/afterEach\(async \(\) => \{/, b3tests + "\n  afterEach(async () => {");
fs.writeFileSync("tests/company.api.test.js", t);

