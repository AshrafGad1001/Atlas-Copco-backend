const request = require('supertest');
const app = require('../app');
const User = require('../src/models/User');

describe('Auth Endpoints', () => {
  let adminToken;
  let adminId;

  beforeEach(async () => {
    const adminUser = await User.create({
      fullName: 'Auth Admin',
      username: 'auth.admin',
      email: 'auth@test.com',
      role: 'admin',
      password: 'password123'
    });
    adminId = adminUser._id;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'auth.admin', password: 'password123' });
    
    if (res.headers['set-cookie']) {
      adminToken = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'auth.admin', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.password).toBeUndefined();
      
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');
      
      adminToken = cookies[0].split(';')[0].split('=')[1];
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'auth.admin', password: 'wrong' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('اسم المستخدم أو كلمة المرور غير صحيحة');
    });

    it('should fail with invalid username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'password123' });

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'auth.admin' }); // missing password

      expect(res.statusCode).toBe(400);
      expect(res.body.errors[0].field).toBe('password');
    });

    it('should fail if user is inactive', async () => {
      await User.findByIdAndUpdate(adminId, { isActive: false });
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'auth.admin', password: 'password123' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('الحساب معطل');
      
      await User.findByIdAndUpdate(adminId, { isActive: true }); // revert
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user data if token is valid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.username).toBe('auth.admin');
    });

    it('should fail if no token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.statusCode).toBe(401);
    });
    
    it('should fail if token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=invalidtoken`]);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the cookie on logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie'][0]).toContain('token=none');
    });
  });

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
        .set("Cookie", [`token=${forgedToken}`])
        .send({ name: "Fake Region" });
        
      expect(res.statusCode).toBe(401);
    });
  });
});
