import { describe, test } from 'node:test';
import { Marked } from 'marked';
import markedMultilineTable from '../src/index.ts';

describe('marked-multiline-table', () => {
  test('standard GFM table still works', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n| td 3 | td 4 |\n'));
  });

  test('multiline rows using colon delimiter', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n: td 1 :         :\n| td 3| td 4 |\n:       : td 4 :\n: td 3 : td 4 :\n'));
  });

  test('multiline with aligned columns', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| left | center | right |\n|:-----|:------:|------:|\n| a    | b      | c     |\n: aa  :   bb   :   cc  :\n'));
  });

  test('continuation row at start with no base row is ignored', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| th 1 | th 2 |\n|------|------|\n: td 1 : td 2 :\n| td 3 | td 4 |\n'));
  });

  test('table without continuation rows is unchanged', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| 1 | 2 |\n'));
  });

  test('non-table markdown is unchanged', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('not a table'));
  });
});
