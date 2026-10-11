const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
const Company = require('../src/models/Company');
const Visit = require('../src/models/Visit');

describe('Regression Fixes', () => {
  let world;
  let adminAgent;
  let engaAgent;

  beforeEach(async () => {
    world = await setupWorld();
    adminAgent = await loginAs(app, world.admin);
    engaAgent = await loginAs(app, world.enga);
  });

  describe('GET /companies/:id', () => {
    it('admin gets 200', async () => {
      const res = await adminAgent.get('/api/companies/' + world.c1._id);
      expect(res.statusCode).toBe(200);
    });
    it('engineer gets 200 in their region', async () => {
      const res = await engaAgent.get('/api/companies/' + world.c1._id);
      expect(res.statusCode).toBe(200);
    });
    it('engineer gets 403 outside their region', async () => {
      const res = await engaAgent.get('/api/companies/' + world.c2._id);
      expect(res.statusCode).toBe(403);
    });
    it('invalid id gets 400', async () => {
      const res = await adminAgent.get('/api/companies/invalid');
      expect(res.statusCode).toBe(400);
    });
    it('deleted company gets 404', async () => {
      const c = await Company.create({ nameAr: 'Del', nameEn: 'Del', region: world.region1._id, isDeleted: true });
      const res = await adminAgent.get('/api/companies/' + c._id);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Engineer Data Shape', () => {
    it('visits/mine has only _id, fullName, profileImage', async () => {
      const res = await engaAgent.get('/api/visits/mine');
      expect(res.statusCode).toBe(200);
      const keys = Object.keys(res.body.data[0].engineer).sort();
      expect(keys).toEqual(['_id', 'fullName', 'profileImage']);
    });
    it('admin/visits has only _id, fullName, profileImage', async () => {
      const res = await adminAgent.get('/api/admin/visits');
      expect(res.statusCode).toBe(200);
      const keys = Object.keys(res.body.data[0].engineer).sort();
      expect(keys).toEqual(['_id', 'fullName', 'profileImage']);
    });
    it('history has only _id, fullName, profileImage', async () => {
      const res = await engaAgent.get('/api/companies/' + world.c1._id + '/history');
      expect(res.statusCode).toBe(200);
      const keys = Object.keys(res.body.data.visits[0].engineer).sort();
      expect(keys).toEqual(['_id', 'fullName', 'profileImage']);
    });
  });

  describe('Login Normalization', () => {
    it('uppercase login returns 200', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'ENGA', password: 'password123' });
      expect(res.statusCode).toBe(200);
    });
    it('spaces login returns 200', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: ' enga ', password: 'password123' });
      expect(res.statusCode).toBe(200);
    });
    it('wrong password returns 401 with same message as wrong username', async () => {
      const res1 = await request(app).post('/api/auth/login').send({ username: 'enga', password: 'wrong' });
      const res2 = await request(app).post('/api/auth/login').send({ username: 'notexist', password: 'password123' });
      expect(res1.statusCode).toBe(401);
      expect(res2.statusCode).toBe(401);
      expect(res1.body.message).toBe(res2.body.message);
    });
  });

  describe('History Shape', () => {
    it('returns visits, company, pagination in data', async () => {
      const res = await engaAgent.get('/api/companies/' + world.c1._id + '/history');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('visits');
      expect(res.body.data).toHaveProperty('company');
      expect(res.body.data).toHaveProperty('pagination');
    });
  });

  describe('Validation Message', () => {
    it('returns exact arabic message for one error', async () => {
      const res = await adminAgent.post('/api/regions').send({ name: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.message).not.toBe('بيانات غير صالحة');
      expect(res.body.message).toBe(res.body.errors[0].message);
    });
  });
});
