const mongoose = require('mongoose');

describe('Database Setup Guard', () => {
  it('should connect to the test database successfully', () => {
    expect(mongoose.connection.readyState).toBe(1);
    expect(mongoose.connection.name).toContain('test');
  });
});
