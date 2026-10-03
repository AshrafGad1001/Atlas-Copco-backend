
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");

const b4tests = `
  it("B4 duplicate logic exact match returns 409 DUPLICATE", async () => {
    await Company.create({ nameAr: "\\u0623\\u062d\\u0645\\u062f", region: engRegionId });
    const res = await request(app)
      .post("/api/companies")
      .set("Cookie", [\`token=\${adminToken}\`])
      .send({ nameAr: "\\u0627\\u062d\\u0645\\u062f", region: engRegionId });
    
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("DUPLICATE");
  });

  it("B4 duplicate logic similar match returns 409 SIMILAR_EXISTS unless confirmSimilar=true", async () => {
    await Company.create({ nameAr: "\\u0623\\u062d\\u0645\\u062f \\u0645\\u062d\\u0645\\u062f", region: engRegionId });
    const payload = { nameAr: "\\u0623\\u062d\\u0645\\u062f", region: engRegionId };
    
    let res = await request(app)
      .post("/api/companies")
      .set("Cookie", [\`token=\${adminToken}\`])
      .send(payload);
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe("SIMILAR_EXISTS");

    res = await request(app)
      .post("/api/companies?confirmSimilar=true")
      .set("Cookie", [\`token=\${adminToken}\`])
      .send(payload);
    expect(res.statusCode).toBe(201);
  });
`;

t = t.replace(/afterEach\(async \(\) => \{/, b4tests + "\n  afterEach(async () => {");
fs.writeFileSync("tests/company.api.test.js", t);

