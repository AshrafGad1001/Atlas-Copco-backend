const request = require('supertest');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Region = require('../src/models/Region');
const Company = require('../src/models/Company');
const Visit = require('../src/models/Visit');

async function setupWorld() {
  const world = {};

  // Regions
  world.region1 = await Region.create({ name: 'Region 1' });
  world.region2 = await Region.create({ name: 'Region 2' });

  // Users
  world.admin = await User.create({
    fullName: 'Admin User',
    username: 'admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
    phones: ['01000000000']
  });

  world.engA = await User.create({
    fullName: 'Engineer A',
    username: 'engA',
    email: 'enga@test.com',
    password: 'password123',
    role: 'engineer',
    region: world.region1._id,
    phones: ['01000000001']
  });

  world.engC = await User.create({
    fullName: 'Engineer C',
    username: 'engC',
    email: 'engc@test.com',
    password: 'password123',
    role: 'engineer',
    region: world.region1._id,
    phones: ['01000000003']
  });

  world.engB = await User.create({
    fullName: 'Engineer B',
    username: 'engB',
    email: 'engb@test.com',
    password: 'password123',
    role: 'engineer',
    region: world.region2._id,
    phones: ['01000000002']
  });

  world.engInactive = await User.create({
    fullName: 'Engineer Inactive',
    username: 'engIn',
    email: 'engin@test.com',
    password: 'password123',
    role: 'engineer',
    region: world.region1._id,
    isActive: false,
    phones: ['01000000004']
  });

  // Companies
  world.c1 = await Company.create({
    nameAr: 'شركة 1',
    nameEn: 'Company 1',
    region: world.region1._id,
    address: 'Address 1'
  });

  world.c1b = await Company.create({
    nameAr: 'شركة 1 ب',
    nameEn: 'Company 1b',
    region: world.region1._id,
    address: 'Address 1b'
  });

  world.c2 = await Company.create({
    nameAr: 'شركة 2',
    nameEn: 'Company 2',
    region: world.region2._id,
    address: 'Address 2'
  });

  // Visits
  world.vA1 = await Visit.create({
    company: world.c1._id,
    engineer: world.engA._id,
    visitDate: new Date(),
    type: 'completed',
    notes: 'Visit A1 notes',
    attendees: [
      { name: 'Att1', phone: '0123' },
      { name: 'Att2', phone: '0124' }
    ]
  });

  world.vC1 = await Visit.create({
    company: world.c1._id,
    engineer: world.engC._id,
    visitDate: new Date(),
    type: 'planned',
    notes: 'Visit C1 notes',
    attendees: []
  });

  world.vB2 = await Visit.create({
    company: world.c2._id,
    engineer: world.engB._id,
    visitDate: new Date(),
    type: 'completed',
    notes: 'Visit B2 notes',
    attendees: []
  });

  return world;
}

async function loginAs(app, user) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username: user.username, password: 'password123' });
  return agent;
}

async function asXlsxRows(res) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(res.body);
  const worksheet = workbook.worksheets[0];
  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // skip header
      rows.push(row.values);
    }
  });
  return rows;
}

module.exports = { setupWorld, loginAs, asXlsxRows };
