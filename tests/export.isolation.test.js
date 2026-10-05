require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupWorld, loginAs, asXlsxRows } = require('./helpers');
const { assertSafeTestUri } = require('./testGuard');

let world;
let adminAgent;
let engAAgent;

beforeEach(async () => {
  assertSafeTestUri(process.env.MONGO_URI_TEST);
  await mongoose.connect(process.env.MONGO_URI_TEST);
  await mongoose.connection.db.dropDatabase();
  world = await setupWorld();
  adminAgent = await loginAs(app, world.admin);
  engAAgent = await loginAs(app, world.engA);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Export Isolation Tests', () => {
  it('A GET /export-visits returns his visits only (vA1)', async () => {
    const res = await engAAgent.get('/api/reports/export-visits').responseType('blob');
    expect(res.statusCode).toBe(200);
    
    const rows = await asXlsxRows(res);
    expect(rows.length).toBe(1);
    
    // Check if the visit exported is A's visit (vA1 is in Company 1)
    // Excel structure depends on export logic, but usually company name is there
    const rowString = JSON.stringify(rows[0]);
    expect(rowString).toContain('Company 1');
  });

  it('Admin GET /export-visits returns all visits', async () => {
    const res = await adminAgent.get('/api/reports/export-visits').responseType('blob');
    expect(res.statusCode).toBe(200);
    
    const rows = await asXlsxRows(res);
    expect(rows.length).toBe(3); // vA1, vC1, vB2
  });

  it('Admin GET /export-visits?region=region1 returns vA1 and vC1 only', async () => {
    const res = await adminAgent.get('/api/reports/export-visits?region=' + world.region1._id).responseType('blob');
    expect(res.statusCode).toBe(200);
    
    const rows = await asXlsxRows(res);
    expect(rows.length).toBe(2);
    
    const stringified = JSON.stringify(rows);
    expect(stringified).toContain('Company 1');
    expect(stringified).not.toContain('Company 2');
  });
});
