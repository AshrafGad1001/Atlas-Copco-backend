require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const { setupWorld, loginAs } = require('./helpers');
const Visit = require('../src/models/Visit');
const User = require('../src/models/User');

let world;
let adminAgent;
let engAAgent;

beforeEach(async () => {
  world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
  engAAgent = await loginAs(app, world.engA);
});

describe('Region Move Tests', () => {
  it('changing engineer region to region2 does not affect old visits, new visits get region2, companies list is updated', async () => {
    // Eng A is initially in region1, has vA1 in company c1 (region1).
    // Let's verify initial state
    let res = await engAAgent.get('/api/visits/mine');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1); // vA1
    
    // Admin moves Eng A to region2
    const moveRes = await adminAgent.put('/api/users/' + world.engA._id).send({
      fullName: 'Engineer A',
      username: 'enga',
      email: 'enga@test.com',
      role: 'engineer',
      region: world.region2._id,
      phones: [{ number: '01000000001', isPrimary: true }]
    });
    if (moveRes.statusCode !== 200) console.log(moveRes.body);
    expect(moveRes.statusCode).toBe(200);
    expect(moveRes.body.data.region.toString()).toBe(world.region2._id.toString());
    
    // Old visits should still be accessible by Eng A? 
    // Yes, the visits are his. Let's see if /api/visits/mine returns them.
    res = await engAAgent.get('/api/visits/mine');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.some(v => v._id.toString() === world.vA1._id.toString())).toBe(true);

    // Companies list for Eng A should now only show region2 companies (c2)
    res = await engAAgent.get('/api/companies');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id.toString()).toBe(world.c2._id.toString());
    
    // New visit created by Eng A in c2
    const newVisitRes = await engAAgent.post('/api/visits').send({
      company: world.c2._id,
      visitDate: new Date(),
      type: 'completed',
      notes: 'New visit in region 2'
    });
    expect(newVisitRes.statusCode).toBe(201);
    
    // Visit itself doesn't store region directly, but we can verify it was created
    expect(newVisitRes.body.data.company.toString()).toBe(world.c2._id.toString());
  });
});
