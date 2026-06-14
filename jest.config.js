/**
 * Jest configuration for JWTForge
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Requires Cloudflare Workers environment
    '!src/openapi.js', // Requires request/response context
    '!src/discovery.js', // Requires request context
    '!src/introspect.js', // Requires request context
    '!src/tokenexchange.js', // Requires request context
    '!src/durable.js', // Cloudflare Durable Objects storage backend
    '!src/kv.js', // Cloudflare Workers KV storage backend
    '!src/storage.js' // Storage abstraction layer
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testPathIgnorePatterns: ['/node_modules/', '/tests/'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/']
};
