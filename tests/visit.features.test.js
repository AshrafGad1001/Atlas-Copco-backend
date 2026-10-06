require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const { setupWorld, loginAs } = require('./helpers');
const Visit = require('../src/models/Visit');

let world;
let engAAgent;

beforeEach(async () => {
  world = await setupWorld();
  engAAgent = await loginAs(app, world.engA);
});

describe('Visit Features Tests', () => {
  it('cannot update visit after 24 hours, returns ended timeout error', async () => {
    // create old visit directly in DB to bypass logic
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 25);
    
    let oldVisit = await Visit.create({
      company: world.c1._id,
      engineer: world.engA._id,
      visitDate: oldDate,
      type: 'planned',
      notes: 'Old note'
    });
    await Visit.collection.updateOne({ _id: oldVisit._id }, { $set: { createdAt: oldDate } });
    
    // Attempt to update
    const res = await engAAgent.patch('/api/visits/' + oldVisit._id).send({
      notes: 'New note'
    });
    
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/انتهت مهلة التعديل \(24 ساعة\)/);
  });

  it('cannot create future visit', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    
    const res = await engAAgent.post('/api/visits').send({
      company: world.c1._id,
      visitDate: futureDate,
      type: 'planned',
      notes: 'Future note'
    });
    
    expect(res.statusCode).toBe(400);
    // error message doesn't matter strictly as long as it's 400
  });
});
