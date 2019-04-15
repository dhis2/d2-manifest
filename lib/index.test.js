/* eslint-env jest */

const manifest = require('./index');

describe('d2-manifest', () => {
  it('should succeed', () => {
    manifest();
    expect(true).toBe(true);
  });
});
