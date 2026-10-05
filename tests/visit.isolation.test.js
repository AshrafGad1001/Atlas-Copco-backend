require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
const { assertSafeTestUri } = require('./testGuard');
const Visit = require('../src/models/Visit');

let world;
let adminAgent;
let engAAgent;
let engBAgent;

beforeAll(async () => {
  assertSafeTestUri(process.env.MONGO_URI_TEST);
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.db.dropDatabase();
  world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
  engAAgent = await loginAs(app, world.engA);
  engBAgent = await loginAs(app, world.engB);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Visit Isolation Tests', () => {
  it('A mine: vA1 only', async () => {
    const res = await engAAgent.get('/api/visits/mine');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id.toString()).toBe(world.vA1._id.toString());
  });

  it('B mine: vB2 only', async () => {
    const res = await engBAgent.get('/api/visits/mine');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id.toString()).toBe(world.vB2._id.toString());
  });

  it('A GET, PATCH, DELETE on vC1 (same region, diff engineer) = 403', async () => {
    let res = await engAAgent.get('/api/visits/' + world.vC1._id);
    expect(res.statusCode).toBe(403);
    
    res = await engAAgent.patch('/api/visits/' + world.vC1._id).send({ notes: 'new' });
    expect(res.statusCode).toBe(403);
    
    res = await engAAgent.delete('/api/visits/' + world.vC1._id);
    expect(res.statusCode).toBe(403);
  });

  it('B GET on vA1 = 403', async () => {
    const res = await engBAgent.get('/api/visits/' + world.vA1._id);
    expect(res.statusCode).toBe(403);
  });

  it('A creates visit on c2 (diff region) = 403', async () => {
    const res = await engAAgent.post('/api/visits').send({
      company: world.c2._id,
      visitDate: new Date(),
      type: 'completed'
    });
    expect(res.statusCode).toBe(403);
  });

  it('A creates visit with engineer=C in body: saved as A', async () => {
    const res = await engAAgent.post('/api/visits').send({
      company: world.c1._id,
      engineer: world.engC._id,
      visitDate: new Date(),
      type: 'completed'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.engineer._id.toString()).toBe(world.engA._id.toString());
  });

  it('Admin GET any visit = 200', async () => {
    let res = await adminAgent.get('/api/admin/visits/' + world.vA1._id);
    expect(res.statusCode).toBe(200);
    expect(res.body.data._id.toString()).toBe(world.vA1._id.toString());
    
    res = await adminAgent.get('/api/admin/visits/' + world.vC1._id);
    expect(res.statusCode).toBe(200);
    expect(res.body.data._id.toString()).toBe(world.vC1._id.toString());
  });
});
