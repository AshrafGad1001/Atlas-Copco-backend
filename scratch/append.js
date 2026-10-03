
const fs = require("fs");
let code = fs.readFileSync("tests/auth.test.js", "utf8");

code = code.replace(/\n\}\);\n?$/, `
  describe("Logout Additional Tests", () => {
    it("should clear cookie when logged in", async () => {
      const res1 = await request(app).post("/api/auth/login").send({ username: "auth.admin", password: "password123" });
      const token = res1.headers["set-cookie"][0].split(";")[0];
      const res = await request(app).post("/api/auth/logout").set("Cookie", [token]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["set-cookie"][0]).toMatch(/token=none/);
      expect(res.headers["set-cookie"][0]).toMatch(/Max-Age|Expires/);
    });
    it("should clear cookie even without a token", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.statusCode).toBe(200);
      expect(res.headers["set-cookie"][0]).toMatch(/token=none/);
    });
    it("should clear cookie with a forged token", async () => {
      const res = await request(app).post("/api/auth/logout").set("Cookie", ["token=forged"]);
      expect(res.statusCode).toBe(200);
      expect(res.headers["set-cookie"][0]).toMatch(/token=none/);
    });
  });

  describe("Forged Cookie Tests", () => {
    it("should fail with 401 on admin route with invalid token signature", async () => {
      const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZDVkYmY1ZDk4MzFiMWY5ZDcxMjM0NSIsInJvbGUiOiJhZG1pbiIsInR2IjowLCJpYXQiOjE2MjkyMTIzNDUsImV4cCI6MTkyOTIxMjM0NX0.invalidsignature";
      const res = await request(app)
        .post("/api/regions")
        .set("Cookie", [\`token=\${forgedToken}\`])
        .send({ name: "Fake Region" });
        
      expect(res.statusCode).toBe(401);
    });
  });
});
`);
fs.writeFileSync("tests/auth.test.js", code);

