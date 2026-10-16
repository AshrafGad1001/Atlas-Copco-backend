require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
const User = require('../src/models/User');

let world;
let engaAgent;

beforeEach(async () => {
        world = await setupWorld();
  engaAgent = await loginAs(app, world.enga);
});


describe('Profile Isolation Tests', () => {
  it('PATCH /profile ignores role, region, username, isActive, _id', async () => {
    const maliciousPayload = {
      fullName: 'Engineer A Mod',
      role: 'admin',
      region: world.region2._id.toString(),
      username: 'enga_hacked',
      isActive: false,
      _id: new mongoose.Types.ObjectId().toString()
    };
    
    const res = await engaAgent.patch('/api/profile').send(maliciousPayload);
    expect(res.statusCode).toBe(200);
    
    // verify in DB
    const dbUser = await User.findById(world.enga._id);
    expect(dbUser.fullName).toBe('Engineer A Mod');
    expect(dbUser.role).toBe('engineer');
    expect(dbUser.region.toString()).toBe(world.region1._id.toString());
    expect(dbUser.username).toBe('enga');
    expect(dbUser.isActive).toBe(true);
    expect(dbUser._id.toString()).toBe(world.enga._id.toString());
  });

  it('GET /auth/me returns the profile completely', async () => {
    await engaAgent.patch('/api/profile').send({ fullName: 'Engineer A Mod' });
    const res = await engaAgent.get('/api/auth/me');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.username).toBe('enga');
    expect(res.body.data.role).toBe('engineer');
    expect(res.body.data.fullName).toBe('Engineer A Mod');
  });
});
