const mongoose = require('mongoose');
const Region = require('../src/models/Region');

describe('Region Model Test', () => {
  it('should create and save a region successfully', async () => {
    const validRegion = new Region({ name: 'Cairo' });
    const savedRegion = await validRegion.save();
    
    expect(savedRegion._id).toBeDefined();
    expect(savedRegion.name).toBe('Cairo');
  });

  it('should fail if name is not provided', async () => {
    const invalidRegion = new Region({});
    let err;
    try {
      await invalidRegion.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
  });

  it('should fail if name is duplicate', async () => {
    await new Region({ name: 'Alexandria' }).save();
    const duplicateRegion = new Region({ name: 'Alexandria' });
    let err;
    try {
      await duplicateRegion.save();
    } catch (error) {
      err = error;
    }
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });
});
