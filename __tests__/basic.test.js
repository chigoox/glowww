const { describe, it, expect } = require('@jest/globals');

describe('Basic Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
