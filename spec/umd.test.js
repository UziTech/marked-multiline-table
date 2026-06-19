import { describe, test } from 'node:test';
import '../lib/index.umd.js';

describe('marked-multiline-table umd', () => {
  test('test umd global', (t) => {
    t.assert.equal(typeof markedMultilineTable, 'function');
  });
});
