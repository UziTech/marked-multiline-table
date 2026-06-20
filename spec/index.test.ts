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

  test('useBlockTokens parses cells as block tokens', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable({ useBlockTokens: true }));
    t.assert.snapshot(marked.parse('| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n'));
  });

  test('useBlockTokens with multiline cells', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable({ useBlockTokens: true }));
    t.assert.snapshot(marked.parse('| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n: td 1 :      :\n'));
  });

  // Column spanning tests
  test('colspan: basic body cell spanning two columns', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b | c |\n|---|---|---|\n| span || c |\n'));
  });

  test('colspan: header cell spanning two columns', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| H1 | Grouping ||\n|---|---|---|\n| a | b | c |\n'));
  });

  test('colspan: spanning full row', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b | c |\n|---|---|---|\n| full row |||\n'));
  });

  test('colspan: with continuation rows', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b | c |\n|---|---|---|\n| span || c |\n: more  ::   :\n'));
  });

  test('colspan: mixed colspan and normal cells', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b | c | d |\n|---|---|---|---|\n| span || c | d |\n| a | span2 || d |\n'));
  });

  test('colspan: aligned cells after spanning cell use starting column alignment', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| left | center | right |\n|:-----|:------:|------:|\n| span || c |\n'));
  });

  // Row spanning tests
  test('rowspan: basic two-row span', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| H1 | H2 |\n|---|---|\n| span | A |\n| ^| B |\n'));
  });

  test('rowspan: three-row span', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| H1 | H2 |\n|---|---|\n| This cell | Cell A |\n| spans three ^| Cell B |\n| rows ^| Cell C |\n'));
  });

  test('rowspan: text concatenation with newline', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    const result = marked.parse('| H1 | H2 |\n|---|---|\n| top | A |\n| bottom ^| B |\n');
    t.assert.snapshot(result);
  });

  test('rowspan: caret stripped from rendered text', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    const result = marked.parse('| H1 | H2 |\n|---|---|\n| hello | A |\n| world ^| B |\n');
    // The ^ should be stripped and not appear in output
    t.assert.ok(!(result as string).includes('^'));
    t.assert.snapshot(result);
  });

  test('rowspan: multiple columns spanning', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| A | B | C |\n|---|---|---|\n| r1 | r1 | r1 |\n| ^| ^| r2 |\n'));
  });

  test('rowspan: with continuation rows', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| H1 | H2 |\n|---|---|\n| line1 | A |\n: line2 :   :\n| ^| B |\n'));
  });

  // Caption tests
  test('caption: before table', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('[My Table Caption]\n| a | b |\n|---|---|\n| 1 | 2 |\n'));
  });

  test('caption: with label', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('[My Caption][my-table-id]\n| a | b |\n|---|---|\n| 1 | 2 |\n'));
  });

  test('caption: after table', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| a | b |\n|---|---|\n| 1 | 2 |\n[After Caption]\n'));
  });

  test('caption: before and after, first wins', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('[Before Caption]\n| a | b |\n|---|---|\n| 1 | 2 |\n[After Caption]\n'));
  });

  test('caption: with label, empty label uses caption', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('[My Caption][]\n| a | b |\n|---|---|\n| 1 | 2 |\n'));
  });

  // Combined features tests
  test('combined: colspan and rowspan', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('| A | B | C |\n|---|---|---|\n| R1A | span || \n| R2A | ^| R2C |\n'));
  });

  test('combined: caption with colspan', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('[Complex Table]\n| H1 | Grouping ||\n|---|---|---|\n| a | b | c |\n'));
  });

  test('combined: all features', (t) => {
    const marked = new Marked();
    marked.use(markedMultilineTable());
    t.assert.snapshot(marked.parse('[Full Feature Table][full-table]\n| H1 | H2 | H3 |\n|---|---|---|\n| span || c |\n| a | b ^| c |\n| a | b | c |\n'));
  });
});
