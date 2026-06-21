# marked-multiline-table

A [marked](https://github.com/markedjs/marked) extension to support multiline tables in markdown.

## Description

This extension allows table cell values to span across multiple lines using continuation lines, as well as supporting advanced layout features like column spanning, row spanning, and table captions.

## Usage

```js
import { Marked } from "marked";
import markedMultilineTable from "marked-multiline-table";

// or UMD script
// <script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/marked-multiline-table/lib/index.umd.js"></script>
// const { Marked } = marked;

// Initialize marked and load the extension with optional settings
const marked = new Marked();
marked.use(markedMultilineTable({
  useBlockTokens: true // Parses cell contents as block tokens (e.g. paragraphs, lists)
}));

// A markdown table showcasing captions, custom separators (=),
// column spanning (||), row spanning (^), and multiline cells (:)
const markdown = `
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
`;

console.log(marked.parse(markdown));
```

### Options

| Option           | Type    | Default | Description                          |
|------------------|---------|---------|--------------------------------------|
| `useBlockTokens` | boolean | `false` | Process cell content as block tokens |

---

## Specification

This extension combines traditional [**MultiMarkdown (MMD)**](https://fletcher.github.io/MultiMarkdown-6/syntax/tables.html) syntax with the [**JustATheory (David Wheeler's 2009 RFC)**](https://justatheory.com/2009/02/markdown-table-rfc/) proposals.

### 1. Core Structural Syntax

A table consists of header rows, a separator line, and body rows. Columns are defined by vertical bars (`|`).

- **Outer Pipes:** Pipes at the beginning and end of each row are optional.

  ```markdown
  | Header 1 | Header 2 |
  |----------|----------|
  | Cell 1   | Cell 2   |
  ```

  is equivalent to:

  ```markdown
   Header 1 | Header 2
  ----------|----------
   Cell 1   | Cell 2
  ```

- **Row Separation:** Each row is normally written on a single line (unless using continuation rows).

### 2. Header Separator Lines & Column Alignment

The separator line dividing the headers from the body must consist only of the characters `|`, `-`, `=`, `:`, `.`, `+`, spaces, or a valid column width.

- **Column Delimiters:** In the separator line, `+` and `|` can be used interchangeably as column boundaries (e.g. `+---+---+`, `|---|---|`, or mixed like `|---+---|`).

#### 2.1 Explicit Alignment (MultiMarkdown / PHP Markdown Extra)

Alignment is defined by placing colons (`:`) in the separator cells:

- **Left Align:** `:` at the left (e.g., `:---`)
- **Right Align:** `:` at the right (e.g., `---:`)
- **Center Align:** `:` at both ends (e.g., `:---:`)

#### 2.2 Column Widths

You can specify a column's width in the separator line by including any valid width value surrounded by at least one separator character.

```markdown
| Header 1 |       Header 2    |
|:---50%---|----min-content---:|
| Left 50% | Right min-content |
```

This will apply a `width` attribute to the `<th>` and `<td>` elements in that column.

### 3. Multiline Cell Continuation (JustATheory RFC)

Standard markdown tables require all cell contents to reside on a single line. The JustATheory RFC introduces **continuation rows** using the colon (`:`) as a line-continuation marker (mnemonic for a broken pipe).

#### 3.1 Continuation Row Syntax

1. **Indicator:** A continuation row begins with a colon (`:`).
2. **Delimiters:** Cells on a continuation row are separated by colons (`:`) instead of pipes (`|`).
3. **Behavior:** The text within each continuation cell is appended to the corresponding cell of the preceding row as a new line of content.
4. **Spacing & Alignment:** Continuation cell contents must line up with the column boundaries established in the preceding rows.

#### 3.2 Multiline Example

```markdown
| Column 1 | Column 2 |
: Column 1 : Column 2 :
|----------|----------|
| Line 1   | Hello    |
: Line 2   : World    :
| Line 3   | Single   |
```

**Rendered Output:**

- Header Cell 1: `Column 1\nColumn 1`
- Header Cell 2: `Column 2\nColumn 2`
- Body Cell 1,1: `Line 1\nLine 2`
- Body Cell 1,2: `Hello\nWorld`
- Body Cell 2,1: `Line 3`
- Body Cell 2,2: `Single`

### 4. Advanced Layout Features

#### 4.1 Column Spanning (Multi-column Cells)

To indicate that a cell should span multiple columns, add additional pipes (`|`) at the end of the cell content.

```markdown
|          |      Grouping      ||
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Span 2             || Cell 3   |
```

#### 4.2 Row Spanning (Multi-row Cells)

Denote cells that should span across the previous row by inserting a caret (`^`) character immediately before the closing pipes:

```
| H1           | H2      |
|--------------|---------|
| This cell    | Cell A  |
| spans three ^| Cell B  |
| rows        ^| Cell C  |
```

Cell contents across rows will be concatenated together with a newline character `\n`. Note that cells can only span multiple rows if they have the same column span.

When combining row spanning with multiline cells (via continuation lines), only the first line of the cell's multiline content must end with the rowspan marker (`^`) to count as a rowspan. If subsequent continuation lines within that cell also end with the rowspan marker (`^`), those markers are automatically removed. If the first line does not end with the marker, the cell does not count as a rowspan, and any markers on continuation lines remain intact.

#### 4.3 Table Captions & Labels

Captions are defined by placing bracketed text `[Caption]` immediately preceding or following the table.

- **Labeling/Anchoring:** You can append an anchor label to the caption: `[My Table Caption][table-anchor-id]`.
- **No Default Anchor:** If no label is provided (or the label is empty), no `id` attribute is added.

```markdown
[Prototype Table Caption][proto-table]
| Header 1 | Header 2 |
|----------|----------|
| Content  | Value    |
```

#### 4.4 Multiple Header Rows

You can define multiple header rows before the separator line. Header cells have all the same features as body cells, including continuation lines, column spanning, and row spanning.

```markdown
| Grouping ||
| Header 1 | Header 2 |
|----------|----------|
| Content  | Value    |
```
