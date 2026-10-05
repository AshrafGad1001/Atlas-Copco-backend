process.env.NODE_ENV = 'test';

module.exports = {
  globalSetup: "./tests/globalSetup.js",
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  clearMocks: true,
  testTimeout: 30000
};
