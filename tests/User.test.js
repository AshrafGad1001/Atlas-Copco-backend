const mongoose = require('mongoose');
const User = require('../src/models/User');
const Region = require('../src/models/Region');

describe('User Model Test', () => {
  let regionId;

  beforeEach(async () => {
    await User.deleteMany();
    await Region.deleteMany();
    const region = await Region.create({ name: 'Giza' });
    regionId = region._id;
  });

  it('should create and save admin user successfully (no region)', async () => {
    const adminData = {
      fullName: 'Admin User',
      username: 'admin.user',
      email: 'admin@test.com',
      role: 'admin',
      password: 'password123',
    };
    const validAdmin = new User(adminData);
    const savedAdmin = await validAdmin.save();

    expect(savedAdmin._id).toBeDefined();
    expect(savedAdmin.role).toBe('admin');
    expect(savedAdmin.tokenVersion).toBe(0);
    expect(savedAdmin.password).not.toBe('password123'); // hashed
    
    // Test toJSON
    const json = savedAdmin.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.__v).toBeUndefined();
  });

  it('should fail if admin has a region', async () => {
    const adminData = {
      fullName: 'Admin Two',
      username: 'admin2',
      email: 'admin2@test.com',
      role: 'admin',
      password: 'password123',
      region: regionId
    };
    await expect(new User(adminData).save()).rejects.toThrow(/Region is forbidden for admins/);
  });

  it('should create and save engineer user successfully', async () => {
    const engData = {
      fullName: 'Eng User',
      username: 'eng_user',
      email: 'eng@test.com',
      role: 'engineer',
      password: 'password123',
      region: regionId,
      phones: [{ number: '01012345678' }],
      birthDate: new Date('1990-01-01')
    };
    const validEng = new User(engData);
    const savedEng = await validEng.save();

    expect(savedEng._id).toBeDefined();
    expect(savedEng.phones[0].isPrimary).toBe(true); // automatically set to true
    expect(savedEng.age).toBeDefined();
    expect(typeof savedEng.age).toBe('number');
  });

  it('should fail if engineer has no region', async () => {
    const engData = {
      fullName: 'Eng Two',
      username: 'eng2',
      email: 'eng2@test.com',
      role: 'engineer',
      password: 'password123',
      phones: [{ number: '01012345678' }]
    };
    await expect(new User(engData).save()).rejects.toThrow(/Region is required for engineers/);
  });

  it('should fail if engineer has no phones', async () => {
    const engData = {
      fullName: 'Eng Three',
      username: 'eng3',
      email: 'eng3@test.com',
      role: 'engineer',
      password: 'password123',
      region: regionId,
      phones: []
    };
    await expect(new User(engData).save()).rejects.toThrow(/At least one phone number is required for an engineer/);
  });

  it('should enforce username format', async () => {
    const badUsername = {
      fullName: 'Bad User',
      username: 'Bad Username!',
      email: 'bad@test.com',
      role: 'admin',
      password: 'password123'
    };
    const user = new User(badUsername);
    let err;
    try {
      await user.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.username.message).toContain('Username can only contain lowercase letters');
  });

  it('should verify password correctly', async () => {
    const adminData = {
      fullName: 'Pass Verifier',
      username: 'pass.verifier',
      email: 'pass@test.com',
      role: 'admin',
      password: 'password123',
    };
    await new User(adminData).save();
    
    const user = await User.findOne({ username: 'pass.verifier' }).select('+password');
    const isMatch = await user.comparePassword('password123');
    const isNotMatch = await user.comparePassword('wrong');
    expect(isMatch).toBe(true);
    expect(isNotMatch).toBe(false);
  });
});
