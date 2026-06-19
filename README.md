# marked-multiline-table

A [marked](https://github.com/markedjs/marked) extension to support multiline tables in markdown.

## Description

This extension allows table cell values to span across multiple lines using continuation lines. Continuation lines start with a colon (`:`) and use colons (`:`) as cell delimiters, matching the columns of the preceding table row.

## Usage

```js
import { Marked } from "marked";
import markedMultilineTable from "marked-multiline-table";

// or UMD script
// <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/marked-multiline-table/lib/index.umd.js"></script>
// const Marked = marked.Marked;

const marked = new Marked();

marked.use(markedMultilineTable());

const markdown = `
| th 1 | th 2 |
|------|------|
| td 1 | td 2 |
: td 1 :      :
| td 3 | td 4 |
:      : td 4 :
: td 3 : td 4 :
`;

console.log(marked.parse(markdown));
```

### Multiline Row Syntax

A continuation row is defined by:
1. Starting with a colon (`:`).
2. Separating columns/cells with a colon (`:`).
3. The content of each cell is appended to the cell in the previous row on a new line.

For example:
```markdown
| Column 1 | Column 2 |
|----------|----------|
| Line 1   | Hello    |
: Line 2   : World    :
```

Renders to a table where cell 1 has:
```
Line 1
Line 2
```
And cell 2 has:
```
Hello
World
```
