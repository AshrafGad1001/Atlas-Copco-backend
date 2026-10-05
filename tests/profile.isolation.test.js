require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
const { assertSafeTestUri } = require('./testGuard');
const User = require('../src/models/User');

let world;
let engAAgent;

beforeEach(async () => {
  assertSafeTestUri(process.env.MONGO_URI_TEST);
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.db.dropDatabase();
  world = await setupWorld();
  engAAgent = await loginAs(app, world.engA);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Profile Isolation Tests', () => {
  it('PATCH /profile ignores role, region, username, isActive, _id', async () => {
    const maliciousPayload = {
      fullName: 'Engineer A Mod',
      role: 'admin',
      region: world.region2._id.toString(),
      username: 'engA_hacked',
      isActive: false,
      _id: new mongoose.Types.ObjectId().toString()
    };
    
    const res = await engAAgent.patch('/api/profile').send(maliciousPayload);
    expect(res.statusCode).toBe(200);
    
    // verify in DB
    const dbUser = await User.findById(world.engA._id);
    expect(dbUser.fullName).toBe('Engineer A Mod');
    expect(dbUser.role).toBe('engineer');
    expect(dbUser.region.toString()).toBe(world.region1._id.toString());
    expect(dbUser.username).toBe('engA');
    expect(dbUser.isActive).toBe(true);
    expect(dbUser._id.toString()).toBe(world.engA._id.toString());
  });

  it('GET /auth/me returns the profile completely', async () => {
    const res = await engAAgent.get('/api/auth/me');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.username).toBe('engA');
    expect(res.body.data.role).toBe('engineer');
    expect(res.body.data.fullName).toBe('Engineer A Mod');
  });
});
