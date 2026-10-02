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
      expect(res.body.success).toBe(false);
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
});
