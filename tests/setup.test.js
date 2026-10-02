const mongoose = require('mongoose');

describe('Database Connection', () => {
  it('should connect to the test database successfully and not the main database', () => {
    expect(mongoose.connection.readyState).toBe(1);
    
    const dbName = mongoose.connection.name;
    expect(dbName).toContain('test');
    
    // We expect it NOT to be atlas_copco (the main DB name)
    expect(dbName).not.toBe('atlas_copco');
  });
});
