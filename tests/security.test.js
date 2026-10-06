require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
let world;
let adminAgent;

beforeEach(async () => {
        world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
});


describe('Security Tests', () => {
  it('NoSQL Injection in login username returns 400 or 401', async () => {
    // If the schema validator is strong, it will return 400.
    const res = await request(app).post('/api/auth/login').send({
      username: { '$gt': '' },
      password: 'password123'
    });
    // Expected 400 because username must be a string according to Zod.
    expect(res.statusCode).toBe(400);
  });

  it('Mongo Object ID Injection (visitId=123) returns 400', async () => {
    const res = await adminAgent.get('/api/admin/visits/123');
    // If it's invalid object ID, the validator or controller should return 400 or 404
    // Wait, the prompt says: "Mongo Object ID Injection (visitId=123 أو visits/undefined) = 400."
    expect(res.statusCode).toBe(400);
  });

  it('XSS in company name returns 400 if sanitized', async () => {
    const xssPayload = '<script>alert(1)</script>Company';
    const res = await adminAgent.post('/api/companies').send({
      nameAr: xssPayload,
      nameEn: 'En',
      region: world.region1._id,
      address: 'Add'
    });
    
    if (res.statusCode === 400) {
      expect(res.body.message).toMatch(/يحتوي على/); // Assuming there's a custom Arabic error msg
    } else {
      expect(res.statusCode).toBe(201);
      // It must be escaped if 201
      expect(res.body.data.nameAr).not.toContain('<script>');
    }
  });
});
