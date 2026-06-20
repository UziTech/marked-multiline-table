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

  test('escaped colons in continuation rows are treated as literal colons', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n: cell with \\: colon : more :\n'));
  });
  test('multiline header cells', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| h1 | h2 |\n: line1 h1 : line1 h2 :\n|---|---|\n| a | b |\n'));
  });

  test('non-table markdown is unchanged', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('not a table'));
  });

  test('body row with more columns than header truncates extra cells', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| 1 | 2 | 3 | 4 |\n'));
  });

  test('continuation row with more colon cells than header truncates extras', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| 1 | 2 |\n: x : y : z : w :\n'));
  });

  test('body row with fewer columns than header pads with empty cells', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b | c |\n|---|---|---|\n| 1 |\n'));
  });

  test('escaped pipe in body cell is treated as literal pipe', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| foo \\| bar | baz |\n'));
  });

  test('empty body after delimiter', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n'));
  });

  test('continuation row with empty cells only appends non-empty', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| 1 | 2 |\n:   : extra :\n'));
  });

  test('header continuation with empty cells', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| h1 | h2 |\n:    : cont :\n|---|---|\n| a | b |\n'));
  });

  test('single line input returns false and falls through', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |'));
  });

  test('no valid delimiter row returns false', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n| c | d |\n'));
  });

  test('double backslash before pipe is not an escape', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| foo \\\\\\\\| bar | baz |\n'));
  });

  test('continuation row with fewer colon cells than header pads', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b | c |\n|---|---|---|\n| 1 | 2 | 3 |\n: x :\n'));
  });

  test('header continuation with more cells than header truncates', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n: x : y : z : w :\n|---|---|\n| 1 | 2 |\n'));
  });

  test('blank rows in body are skipped', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| 1 | 2 |\n\n| 3 | 4 |\n'));
  });
});
