import { describe, test } from 'node:test';
import { Marked, type MarkedOptions } from 'marked';
import markedMultilineTable from '../src/index.ts';
import type { MultilineTableOptions } from '../src/index.ts';

type TestCase = {
  name: string;
  input: string;
  output?: string;
  options?: MultilineTableOptions;
  markedOptions?: MarkedOptions;
};

describe('marked-multiline-table', () => {
  const testCases: TestCase[] = [
    {
      name: 'README Usage example',
      input: `
[Product Comparison Table][product-table]
|                |                Plans               ||
|       Feature ^|     Standard     |     Premium      |
:          Name  :       Plan       :       Plan       :
|===============:|:----------------:|:----------------:|
|          Price |    $9 / month    |   $29 / month    |
|  Core Features |              Included              ||
| Other Features |                                   ^||
|     Multi-line |              Supported             ||
:    Description :          via continuation          ::
:                :                lines               ::
|   Support Tier |   Email Support  |    24/7 Phone    |
|  Other Support |        None      |      & Chat     ^|
|  Extra Add-ons |   Not Available  |     Included     |
`,
    },

    {
      name: 'standard GFM table still works',
      input: '| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n| td 3 | td 4 |\n',
    },

    {
      name: 'no GFM table still works',
      input: '| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n| td 3 | td 4 |\n',
      markedOptions: {
        gfm: false,
      },
    },

    {
      name: 'multiline rows using colon delimiter',
      input: '| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n: td 1 :         :\n| td 3| td 4 |\n:       : td 4 :\n: td 3 : td 4 :\n',
    },

    {
      name: 'multiline with aligned columns',
      input: '| left | center | right |\n|:-----|:------:|------:|\n| a    | b      | c     |\n: aa  :   bb   :   cc  :\n',
    },

    {
      name: 'continuation row at start with no base row is ignored',
      input: '| th 1 | th 2 |\n|------|------|\n: td 1 : td 2 :\n| td 3 | td 4 |\n',
    },

    {
      name: 'table without continuation rows is unchanged',
      input: '| a | b |\n|---|---|\n| 1 | 2 |\n',
    },

    {
      name: 'escaped colons in continuation rows are treated as literal colons',
      input: '| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n: cell with \\: colon : more :\n',
    },
    {
      name: 'multiline header cells',
      input: '| h1 | h2 |\n: line1 h1 : line1 h2 :\n|---|---|\n| a | b |\n',
    },

    {
      name: 'multiple header rows',
      input: '| Main Header 1 | Main Header 2 |\n| Sub 1 | Sub 2 |\n|---|---|\n| a | b |\n',
    },

    {
      name: 'multiple header rows with colspans and rowspans',
      input: '| Grouping ||\n| H1 | H2 |\n|---|---|\n| a | b |\n',
    },

    {
      name: 'non-table markdown is unchanged',
      input: 'not a table',
    },

    {
      name: 'body row with more columns than header truncates extra cells',
      input: '| a | b |\n|---|---|\n| 1 | 2 | 3 | 4 |\n',
    },

    {
      name: 'continuation row with more colon cells than header truncates extras',
      input: '| a | b |\n|---|---|\n| 1 | 2 |\n: x : y : z : w :\n',
    },

    {
      name: 'body row with fewer columns than header pads with empty cells',
      input: '| a | b | c |\n|---|---|---|\n| 1 |\n',
    },

    {
      name: 'escaped pipe in body cell is treated as literal pipe',
      input: '| a | b |\n|---|---|\n| foo \\| bar | baz |\n',
    },

    {
      name: 'empty body after delimiter',
      input: '| a | b |\n|---|---|\n',
    },

    {
      name: 'continuation row with empty cells only appends non-empty',
      input: '| a | b |\n|---|---|\n| 1 | 2 |\n:   : extra :\n',
    },

    {
      name: 'header continuation with empty cells',
      input: '| h1 | h2 |\n:    : cont :\n|---|---|\n| a | b |\n',
    },

    {
      name: 'single line input returns false and falls through',
      input: '| a | b |',
    },

    {
      name: 'no valid delimiter row returns false',
      input: '| a | b |\n| c | d |\n',
    },

    {
      name: 'double backslash before pipe is not an escape',
      input: '| a | b |\n|---|---|\n| foo \\\\\\\\| bar | baz |\n',
    },

    {
      name: 'continuation row with fewer colon cells than header pads',
      input: '| a | b | c |\n|---|---|---|\n| 1 | 2 | 3 |\n: x :\n',
    },

    {
      name: 'header continuation with more cells than header truncates',
      input: '| a | b |\n: x : y : z : w :\n|---|---|\n| 1 | 2 |\n',
    },

    {
      name: 'blank rows in body are skipped',
      input: '| a | b |\n|---|---|\n| 1 | 2 |\n\n| 3 | 4 |\n',
    },

    {
      name: 'useBlockTokens parses cells as block tokens',
      options: { useBlockTokens: true },
      input: '| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n',
    },

    {
      name: 'useBlockTokens with multiline cells',
      options: { useBlockTokens: true },
      input: '| th 1 | th 2 |\n|------|------|\n| td 1 | td 2 |\n: td 1 :      :\n',
    },

    // Column spanning tests
    {
      name: 'colspan: basic body cell spanning two columns',
      input: '| a | b | c |\n|---|---|---|\n| span || c |\n',
    },

    {
      name: 'colspan: header cell spanning two columns',
      input: '| H1 | Grouping ||\n|---|---|---|\n| a | b | c |\n',
    },

    {
      name: 'colspan: spanning full row',
      input: '| a | b | c |\n|---|---|---|\n| full row |||\n',
    },

    {
      name: 'colspan: with continuation rows',
      input: '| a | b | c |\n|---|---|---|\n| span || c |\n: more  ::   :\n',
    },

    {
      name: 'colspan: with continuation rows having text in subsequent columns',
      input: '| a | b | c |\n|---|---|---|\n| span || c |\n: more  :: yes :\n',
    },

    {
      name: 'colspan: mixed colspan and normal cells',
      input: '| a | b | c | d |\n|---|---|---|---|\n| span || c | d |\n| a | span2 || d |\n',
    },

    {
      name: 'colspan: aligned cells after spanning cell use starting column alignment',
      input: '| left | center | right |\n|:-----|:------:|------:|\n| span || c |\n',
    },

    // Row spanning tests
    {
      name: 'rowspan: basic two-row span',
      input: '| H1 | H2 |\n|---|---|\n| span | A |\n| ^| B |\n',
    },

    {
      name: 'rowspan: three-row span',
      input: '| H1 | H2 |\n|---|---|\n| This cell | Cell A |\n| spans three ^| Cell B |\n| rows ^| Cell C |\n',
    },

    {
      name: 'rowspan: text concatenation with newline',
      input: '| H1 | H2 |\n|---|---|\n| top | A |\n| bottom ^| B |\n',
    },

    {
      name: 'rowspan: caret stripped from rendered text',
      input: '| H1 | H2 |\n|---|---|\n| hello | A |\n| world ^| B |\n',
    },

    {
      name: 'rowspan: multiple columns spanning',
      input: '| A | B | C |\n|---|---|---|\n| r1 | r1 | r1 |\n| ^| ^| r2 |\n',
    },

    {
      name: 'rowspan: with continuation rows',
      input: '| H1 | H2 |\n|---|---|\n| line1 | A |\n: line2 :   :\n| ^| B |\n',
    },

    {
      name: 'rowspan with continuation lines: first row has marker, other lines also have marker',
      input: `
| H1      | H2 |
|---------|----|
| Top     | A  |
| Bottom ^| B  |
: Cont   ^:    :
`,
    },

    {
      name: 'rowspan with continuation lines: first row has marker, other lines do not',
      input: `
| H1      | H2 |
|---------|----|
| Top     | A  |
| Bottom ^| B  |
: Cont    :    :
`,
    },

    {
      name: 'rowspan with continuation lines: first row does NOT have marker, other lines do',
      input: `
| H1      | H2 |
|---------|----|
| Top     | A  |
| Bottom  | B  |
: Cont   ^:    :
`,
    },

    // Caption tests
    {
      name: 'caption: before table',
      input: '[My Table Caption]\n| a | b |\n|---|---|\n| 1 | 2 |\n',
    },

    {
      name: 'caption: with label',
      input: '[My Caption][my-table-id]\n| a | b |\n|---|---|\n| 1 | 2 |\n',
    },

    {
      name: 'caption: after table',
      input: '| a | b |\n|---|---|\n| 1 | 2 |\n[After Caption]\n',
    },

    {
      name: 'caption: after table with blank lines',
      input: '| a | b |\n|---|---|\n| 1 | 2 |\n\n[After Caption]\n',
    },

    {
      name: 'caption: before and after, first wins',
      input: '[Before Caption]\n| a | b |\n|---|---|\n| 1 | 2 |\n[After Caption]\n',
    },

    {
      name: 'caption: with label, empty label uses caption',
      input: '[My Caption][]\n| a | b |\n|---|---|\n| 1 | 2 |\n',
    },

    {
      name: 'no outer pipes',
      input: 'a | b\n---|---\n1 | 2\n: 3 : 4\n',
    },

    {
      name: 'no outer pipes with advanced features',
      input: 'H1 | Grouping ||\n---|---|---\na | span ||\n: a2 : span2 ||\n',
    },

    // Combined features tests
    {
      name: 'combined: colspan and rowspan',
      input: '| A | B | C |\n|---|---|---|\n| R1A | span || \n| R2A | ^| R2C |\n',
    },

    {
      name: 'combined: caption with colspan',
      input: '[Complex Table]\n| H1 | Grouping ||\n|---|---|---|\n| a | b | c |\n',
    },

    {
      name: 'combined: all features',
      input: '[Full Feature Table][full-table]\n| H1 | H2 | H3 |\n|---|---|---|\n| span || c |\n| a | b ^| c |\n| a | b | c |\n',
    },

    // Custom separator characters tests
    {
      name: 'separators: equal signs (=)',
      input: '| H1 | H2 |\n|====|====|\n| a  | b  |\n',
    },

    {
      name: 'separators: dots (.)',
      input: '| H1 | H2 |\n|....|....|\n| a  | b  |\n',
    },

    {
      name: 'separators: plus signs (+)',
      input: '| H1 | H2 |\n+----+----+\n| a  | b  |\n',
    },

    {
      name: 'separators: plus signs and pipe',
      input: '| H1 | H2 |\n|----+----|\n| a  | b  |\n',
    },

    {
      name: 'separators: mixed characters and alignment',
      input: '| Left | Center | Right |\n|:==== | :====: | ====: |\n| a    | b      | c     |\n',
    },

    {
      name: 'separators: dots with alignment',
      input: '| Left | Center | Right |\n|:.... | :....: | ....: |\n| a    | b      | c     |\n',
    },

    {
      name: 'separators: plus signs with alignment',
      input: '| Left | Center | Right |\n+:---- | :----: | ----:+\n| a    | b      | c     |\n',
    },

    {
      name: 'separators: spaces and tabs in delimiter',
      input: '| H1 | H2 |\n| -- \t | -- |\n| a  | b  |\n',
    },

    {
      name: 'colspan: header cell colspan alignment mapping',
      input: '| Grouping || Right |\n|:---|---|---:|\n| a | b | c |\n',
    },

    // Width parsing tests
    {
      name: 'width: percentage and px',
      input: '| th 1 | th 2 |\n|-50%-|-50px-|\n| td 1 | td 2 |\n',
    },

    {
      name: 'width: with alignment colons',
      input: '| th 1 | th 2 | th 3 |\n|:-50%-|:-50px-:|-50%-:|\n| td 1 | td 2 | td 3 |\n',
    },

    {
      name: 'width: with different separator characters',
      input: '| th 1 | th 2 | th 3 |\n|=50%=|.50px.|:50%:|\n| td 1 | td 2 | td 3 |\n',
    },

    {
      name: 'width: with surrounding whitespace',
      input: '| th 1 | th 2 |\n|- 50% -|: 50px :|\n| td 1 | td 2 |\n',
    },

    {
      name: 'width: without pipes at ends',
      input: 'th 1 | th 2\n-50%-|-50px-\ntd 1 | td 2\n',
    },

    {
      name: 'width: without separator characters fails',
      input: '| th 1 | th 2 |\n| 50% | 50px |\n| td 1 | td 2 |\n',
    },

    {
      name: 'width: complex width value',
      input: '| th 1 | th 2 |\n|- min-content -|- calc(100% - 20px) -|\n| td 1 | td 2 |\n',
    },
  ];

  for (const testCase of testCases) {
    test(testCase.name, (t) => {
      const marked = new Marked();
      marked.use(markedMultilineTable(testCase.options ?? {}));
      if (testCase.output) {
        t.assert.equal(marked.parse(testCase.input, testCase.markedOptions ?? {}), testCase.output);
      } else {
        t.assert.snapshot(marked.parse(testCase.input, testCase.markedOptions ?? {}));
      }
    });
  }
});
