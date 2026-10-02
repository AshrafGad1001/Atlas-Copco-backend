function assertSafeTestUri(testUri, mainUri) {
  if (!testUri) {
    throw new Error('MONGO_URI_TEST is not defined or empty');
  }
  if (testUri === mainUri) {
    throw new Error('MONGO_URI_TEST must be different from MONGO_URI to prevent data loss');
  }

  // Parse dbName manually because legacy string with commas fails new URL()
  // Example: mongodb://user:pass@host1,host2/dbName?args
  const uriWithoutQuery = testUri.split('?')[0];
  const parts = uriWithoutQuery.split('/');
  const dbName = parts[parts.length - 1];

  if (!dbName || !dbName.toLowerCase().includes('test')) {
    throw new Error('MONGO_URI_TEST database name must contain the word "test"');
  }
}

module.exports = { assertSafeTestUri };
