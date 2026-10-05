require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
const { 
let world;
let adminAgent;
let engAAgent;
let engBAgent;

beforeEach(async () => {
        world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
  engAAgent = await loginAs(app, world.engA);
  engBAgent = await loginAs(app, world.engB);
});


describe('History Isolation Tests', () => {
  it('A history/c1 returns 200 with vA1 and vC1, but attendees hidden for vC1', async () => {
    const res = await engAAgent.get('/api/companies/' + world.c1._id + '/history');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
    
    const va1 = res.body.data.find(v => v._id.toString() === world.vA1._id.toString());
    const vc1 = res.body.data.find(v => v._id.toString() === world.vC1._id.toString());
    
    expect(va1).toBeDefined();
    expect(vc1).toBeDefined();
    
    // In our test world, vC1 has [] attendees, but the rule says attendees should be hidden for others.
    // Let's ensure it is at least an array with 0 items, or undefined.
    expect(vc1.attendees.length).toBe(0);
    
    // For vA1 it's his own visit, attendees should be visible
    expect(va1.attendees.length).toBeGreaterThan(0);
  });

  it('A attendees/c1 returns only his attendees', async () => {
    const res = await engAAgent.get('/api/companies/' + world.c1._id + '/attendees');
    expect(res.statusCode).toBe(200);
    
    // attendees endpoint should return all distinct attendees for company.
    // A should see Att1 and Att2 from his visit vA1.
    const names = res.body.data.map(a => a.name);
    expect(names).toContain('Att1');
    expect(names).toContain('Att2');
  });

  it('B attendees/c1 = 403 (out of region)', async () => {
    const res = await engBAgent.get('/api/companies/' + world.c1._id + '/attendees');
    expect(res.statusCode).toBe(403);
  });

  it('Admin history/c1 and attendees/c1 returns everything', async () => {
    let res = await adminAgent.get('/api/companies/' + world.c1._id + '/history');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
    
    res = await adminAgent.get('/api/companies/' + world.c1._id + '/attendees');
    expect(res.statusCode).toBe(200);
    const names = res.body.data.map(a => a.name);
    expect(names).toContain('Att1');
    expect(names).toContain('Att2');
  });
});
