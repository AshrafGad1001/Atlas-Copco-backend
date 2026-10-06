require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs } = require('./helpers');
const Company = require('../src/models/Company');

let world;
let adminAgent;
let engAgent;

beforeEach(async () => {
        world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
  engAgent = await loginAs(app, world.engA);
});


describe('Company Isolation Tests', () => {
  it('A list: c1 and c1b only', async () => {
    const res = await engAgent.get('/api/companies');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
    const ids = res.body.data.map(c => c._id.toString());
    expect(ids).toContain(world.c1._id.toString());
    expect(ids).toContain(world.c1b._id.toString());
    expect(ids).not.toContain(world.c2._id.toString());
  });

  it('A searches by c2 name: empty', async () => {
    const res = await engAgent.get('/api/companies?search=Company 2');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('A GET, PATCH, DELETE on c2 = 403', async () => {
    let res = await engAgent.get('/api/companies/' + world.c2._id);
    expect(res.statusCode).toBe(403);
    
    res = await engAgent.patch('/api/companies/' + world.c2._id).send({ nameEn: 'New' });
    expect(res.statusCode).toBe(403);
    
    res = await engAgent.delete('/api/companies/' + world.c2._id);
    expect(res.statusCode).toBe(403);
  });

  it('A DELETE on c1 = 403', async () => {
    const res = await engAgent.delete('/api/companies/' + world.c1._id);
    expect(res.statusCode).toBe(403);
  });

  it('A POST with region=region2 in body -> 201, registered in region1', async () => {
    const res = await engAgent.post('/api/companies').send({
      nameAr: 'شركة جديدة',
      nameEn: 'New Company',
      region: world.region2._id.toString(),
      address: 'Address'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.region.toString()).toBe(world.region1._id.toString());
  });

  it('A PATCH on c1 with region and isDeleted in body -> ignored', async () => {
    const res = await engAgent.patch('/api/companies/' + world.c1._id).send({
      region: world.region2._id.toString(),
      isDeleted: true
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.region.toString()).toBe(world.region1._id.toString());
    
    // Check DB to be absolutely sure
    const dbComp = await Company.findById(world.c1._id);
    expect(dbComp.region.toString()).toBe(world.region1._id.toString());
    expect(dbComp.isDeleted).toBe(false);
  });

  it('Admin list sees all, admin ?region=region2 sees c2 only, A with ?region=region2 sees region1 only', async () => {
    let res = await adminAgent.get('/api/companies');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    
    res = await adminAgent.get('/api/companies?region=' + world.region2._id.toString());
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id.toString()).toBe(world.c2._id.toString());
    
    res = await engAgent.get('/api/companies?region=' + world.region2._id.toString());
    expect(res.statusCode).toBe(200);
    // Engineer A is forced to region1, so it sees their region companies (or maybe empty if overridden?
    // Wait, the requirement says "A مع ?region=region2 لسه منطقته بس" which means they see region1 companies.
    const ids = res.body.data.map(c => c._id.toString());
    expect(ids).toContain(world.c1._id.toString());
    expect(ids).not.toContain(world.c2._id.toString());
  });
});
