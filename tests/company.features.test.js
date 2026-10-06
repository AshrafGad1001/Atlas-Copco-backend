require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const { setupWorld, loginAs } = require('./helpers');
const Visit = require('../src/models/Visit');
const Company = require('../src/models/Company');

let world;
let adminAgent;
let engAAgent;

beforeEach(async () => {
  world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
  engAAgent = await loginAs(app, world.engA);
});

describe('Company Features Tests', () => {
  it('deleting a company does not delete its old visits, but prevents new ones', async () => {
    // Eng A has vA1 in c1
    const delRes = await adminAgent.delete('/api/companies/' + world.c1._id);
    expect(delRes.statusCode).toBe(200);

    // Old visit still exists
    const res = await engAAgent.get('/api/visits/mine');
    expect(res.body.data.some(v => v.company._id.toString() === world.c1._id.toString())).toBe(true);

    // Cannot add new visit to deleted company
    const newVisitRes = await engAAgent.post('/api/visits').send({
      company: world.c1._id,
      visitDate: new Date(),
      type: 'completed',
      notes: 'New visit'
    });
    // Can be 400 or 404 depending on how the validation is handled
    expect([400, 404]).toContain(newVisitRes.statusCode);
  });

  it('companies without visits for 90 days appear in stale-companies', async () => {
    // create a company in region1
    const newComp = await Company.create({
      nameAr: 'Company Stale',
      nameEn: 'Company Stale',
      region: world.region1._id,
      classification: 'A',
      createdBy: world.admin._id
    });

    // EngA visits c1 today.
    // Admin gets stale companies. newComp should be there. c1 might be there if we don't have visits, but vA1 is today!
    // Wait, vA1 is created with `visitDate: new Date()` in helpers.js.
    // So c1 is NOT stale. newComp IS stale because it has no visits.
    const res = await adminAgent.get('/api/admin/stats/stale-companies');
    expect(res.statusCode).toBe(200);
    
    // newComp should be in the list
    expect(res.body.data.some(c => c._id.toString() === newComp._id.toString())).toBe(true);
    // c1 should NOT be in the list
    expect(res.body.data.some(c => c._id.toString() === world.c1._id.toString())).toBe(false);
  });
});
