const { assertSafeTestUri } = require('./testGuard');

describe('Database Setup Guard (assertSafeTestUri)', () => {
  const mainUri = 'mongodb+srv://user:pass@cluster.mongodb.net/prod_db';

  it('should throw an error if testUri is missing or empty', () => {
    expect(() => assertSafeTestUri(undefined, mainUri)).toThrow('MONGO_URI_TEST is not defined or empty');
    expect(() => assertSafeTestUri('', mainUri)).toThrow('MONGO_URI_TEST is not defined or empty');
  });

  it('should throw an error if testUri equals mainUri', () => {
    expect(() => assertSafeTestUri(mainUri, mainUri)).toThrow('MONGO_URI_TEST must be different from MONGO_URI to prevent data loss');
  });

  it('should throw an error if database name does not contain "test" (SRV)', () => {
    const badSrv = 'mongodb+srv://user:pass@cluster.mongodb.net/my_dev_db';
    expect(() => assertSafeTestUri(badSrv, mainUri)).toThrow('MONGO_URI_TEST database name must contain the word "test"');
  });

  it('should throw an error if database name does not contain "test" (Legacy)', () => {
    const badLegacy = 'mongodb://user:pass@host:27017/my_dev_db';
    expect(() => assertSafeTestUri(badLegacy, mainUri)).toThrow('MONGO_URI_TEST database name must contain the word "test"');
  });

  it('should pass if database name contains "test" (SRV)', () => {
    const goodSrv = 'mongodb+srv://user:pass@cluster.mongodb.net/my_test_db';
    expect(() => assertSafeTestUri(goodSrv, mainUri)).not.toThrow();
  });

  it('should pass if database name contains "test" (Legacy)', () => {
    const goodLegacy = 'mongodb://user:pass@host:27017/my_test_db';
    expect(() => assertSafeTestUri(goodLegacy, mainUri)).not.toThrow();
  });
});
