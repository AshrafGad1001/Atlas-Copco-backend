
const fs = require("fs");
let t = fs.readFileSync("tests/company.api.test.js", "utf8");

const b7tests = `
  it("B7 import companies from excel", async () => {
    const exceljs = require("exceljs");
    const wb = new exceljs.Workbook();
    const ws = wb.addWorksheet("Sheet 1");
    ws.addRow(["nameAr", "nameEn", "region", "address", "industry", "notes"]); // Header
    ws.addRow(["", "", "Region 1", "", "", ""]); // Ignored: no name
    ws.addRow(["Comp A", "", "Region 1", "Add", "Ind", "Not"]); // Inserted
    ws.addRow(["Comp A", "", "Region 1", "Add", "Ind", "Not"]); // Ignored: intra-file duplicate
    ws.addRow(["Comp B", "", "Bad Region", "Add", "Ind", "Not"]); // Ignored: invalid region
    
    await Company.create({ nameAr: "Existing", region: engRegionId });
    ws.addRow(["Existing", "", "Region 1", "", "", ""]); // Ignored: db duplicate
    
    const path = require("path");
    const testExcel = path.join(__dirname, "test.xlsx");
    await wb.xlsx.writeFile(testExcel);

    const res = await request(app)
      .post("/api/admin/companies/import")
      .set("Cookie", [\`token=\${adminToken}\`])
      .attach("file", testExcel);
      
    expect(res.statusCode).toBe(200);
    expect(res.body.data.added).toBe(1);
    expect(res.body.data.ignored).toBe(4);

    if (fs.existsSync(testExcel)) fs.unlinkSync(testExcel);
  });
`;

t = t.replace(/afterEach\(async \(\) => \{/, b7tests + "\n  afterEach(async () => {");
fs.writeFileSync("tests/company.api.test.js", t);

