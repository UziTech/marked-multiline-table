import type { MarkedExtension, Token, Tokens } from 'marked';

export interface MultilineTableOptions {
  useBlockTokens?: boolean;
}

interface ExtendedTableCell extends Tokens.TableCell {
  colspan: number;
  rowspan: number;
}

const CONTINUATION_DELIMITER = ':';
const ROWSPAN_MARKER = '^';
const CAPTION_RE = /^\[([^\]]+)\](?:\[([^\]]*)\])?$/;

function hasUnescapedPipe(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '|') continue;
    let escaped = false;
    let curr = i;
    while (--curr >= 0 && value[curr] === '\\') escaped = !escaped;
    if (!escaped) return true;
  }
  return false;
}

/**
 * Check if the raw row contains consecutive unescaped pipes (||),
 * indicating a colspan cell.
 */
function hasConsecutivePipes(value: string): boolean {
  for (let i = 0; i < value.length - 1; i++) {
    if (value[i] !== '|') continue;
    let escaped = false;
    let curr = i;
    while (--curr >= 0 && value[curr] === '\\') escaped = !escaped;
    if (escaped) continue;
    // Check if next char is also an unescaped pipe
    if (value[i + 1] === '|') return true;
  }
  return false;
}

function isContinuationRow(value: string): boolean {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith(CONTINUATION_DELIMITER)) return false;
  for (let i = 1; i < trimmed.length; i++) {
    if (trimmed[i] !== CONTINUATION_DELIMITER) continue;
    let escaped = false;
    let curr = i;
    while (--curr >= 0 && trimmed[curr] === '\\') escaped = !escaped;
    if (!escaped) return true;
  }
  return false;
}

function splitCells(row: string, rules: { findPipe: RegExp; splitPipe: RegExp; slashPipe: RegExp }, count?: number): string[] {
  const cells = row
    .replace(rules.findPipe, (match, offset, str) => {
      let escaped = false;
      let curr = offset;
      while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
      return escaped ? '|' : ' |';
    })
    .split(rules.splitPipe);

  if (!cells[0].trim()) cells.shift();
  if (cells.length > 0 && !cells[cells.length - 1].trim()) cells.pop();

  if (count !== undefined) {
    if (cells.length > count) {
      cells.splice(count);
    } else {
      while (cells.length < count) cells.push('');
    }
  }

  return cells.map(c => c.trim().replace(rules.slashPipe, '|'));
}

/**
 * Split cells and detect column spanning.
 * Only treat consecutive empty cells as colspan when the raw source
 * contains consecutive pipes (||). This distinguishes intentional
 * colspan from rows that happen to have empty trailing cells.
 * Returns an array of { text, colspan } objects.
 */
function splitCellsWithColspan(
  row: string,
  rules: { findPipe: RegExp; splitPipe: RegExp; slashPipe: RegExp },
  count: number,
): { text: string; colspan: number }[] {
  const rawCells = splitCells(row, rules, count);

  // Only apply colspan detection if the raw row has consecutive pipes
  if (!hasConsecutivePipes(row)) {
    return rawCells.map(c => ({ text: c.trim(), colspan: 1 }));
  }

  const result: { text: string; colspan: number }[] = [];

  let i = 0;
  while (i < rawCells.length) {
    const text = rawCells[i].trim();
    let colspan = 1;
    // Count consecutive empty cells after this one
    while (i + colspan < rawCells.length && rawCells[i + colspan].trim() === '') {
      colspan++;
    }
    // Only treat as colspan if the current cell is non-empty and there are trailing empties
    if (text !== '' && colspan > 1) {
      result.push({ text, colspan });
      i += colspan;
    } else {
      result.push({ text, colspan: 1 });
      i++;
    }
  }

  return result;
}

function splitColonCells(row: string, count?: number): string[] {
  const parts = row
    .replace(/:/g, (match, offset, str) => {
      let escaped = false;
      let curr = offset;
      while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
      return escaped ? ':' : ' :';
    })
    .split(' :');

  if (!parts[0].trim()) parts.shift();
  if (parts.length > 0 && !parts[parts.length - 1].trim()) parts.pop();

  if (count !== undefined) {
    if (parts.length > count) {
      parts.splice(count);
    } else {
      while (parts.length < count) parts.push('');
    }
  }

  return parts.map(c => c.trim().replace(/\\:/g, ':'));
}

/**
 * Check if a cell's text ends with the rowspan marker `^`.
 * If so, return the text without the marker; otherwise return null.
 */
function extractRowspanMarker(text: string): string | null {
  const trimmed = text.trimEnd();
  if (trimmed.endsWith(ROWSPAN_MARKER)) {
    return trimmed.slice(0, -1).trimEnd();
  }
  return null;
}

/**
 * Check if a line is a valid caption (not a checkbox or similar pattern
 * that happens to be in brackets).
 */
function matchCaption(line: string): { caption: string; label?: string } | null {
  const trimmed = line.trim();
  if (hasUnescapedPipe(trimmed)) return null;
  const match = trimmed.match(CAPTION_RE);
  if (!match) return null;
  // Must have actual content and not be followed by a header row pattern
  // (filtering out false matches like checkbox patterns)
  return { caption: match[1], label: match[2] || undefined };
}

export default function(options: MultilineTableOptions = {}): MarkedExtension {
  const { useBlockTokens = false } = options;

  function tokenizeCells(lexer: { inline(src: string, tokens?: Token[]): Token[]; blockTokens(src: string, tokens?: Token[]): Token[] }, text: string): Token[] {
    if (useBlockTokens) {
      return lexer.blockTokens(text);
    }
    return lexer.inline(text);
  }

  const extension: MarkedExtension = {
    tokenizer: {
      table(src) {
        const lines = src.split('\n');
        if (lines.length < 2) return false;
        const isTableDelimiterLine = (line: string): boolean => (
          this.rules.other.tableDelimiter.test(line)
          && /-/.test(line)
          && /^[|:\-\t ]+$/.test(line)
        );

        // Check for caption before table
        let caption: string | undefined;
        let captionLabel: string | undefined;
        let captionLineConsumed = false;

        // Only try caption if the first line looks like [text] and the
        // next line looks like a table header (has pipes)
        if (lines.length >= 3) {
          const captionResult = matchCaption(lines[0]);
          if (captionResult && hasUnescapedPipe(lines[1])) {
            caption = captionResult.caption;
            captionLabel = captionResult.label;
            lines.shift();
            captionLineConsumed = true;
          }
        }

        // Header row
        const headerLine = lines.shift();
        if (headerLine === undefined) return false;

        // Header continuation rows (start with ':')
        const headerContinuationRows: string[] = [];
        while (
          lines.length
          && isContinuationRow(lines[0])
          && !isTableDelimiterLine(lines[0])
        ) {
          headerContinuationRows.push(lines.shift()!);
        }

        // Delimiter line
        const delimiterLine = lines.shift();
        if (!delimiterLine || !isTableDelimiterLine(delimiterLine)) return false;

        // Parse header cells with colspan detection
        const rawHeaderCells = splitCells(headerLine, this.rules.other);
        const count = rawHeaderCells.length;
        const headerColspanInfo = splitCellsWithColspan(headerLine, this.rules.other, count);

        // Build header cell text array for continuation merging
        const headerCells = rawHeaderCells.slice();

        // Apply header continuation rows
        for (const rawRow of headerContinuationRows) {
          const continuationCells = splitColonCells(rawRow.trim(), count);
          for (let i = 0; i < count; i++) {
            const text = continuationCells[i] ?? '';
            if (text) {
              headerCells[i] += '\n' + text;
            }
          }
        }

        // Parse alignment from delimiter line
        const aligns = delimiterLine.replace(this.rules.other.tableAlignChars, '').split('|');
        const align: Array<'center' | 'left' | 'right' | null> = [];
        for (const alignStr of aligns) {
          const trimmed = alignStr.trim();
          if (this.rules.other.tableAlignRight.test(trimmed)) {
            align.push('right');
          } else if (this.rules.other.tableAlignCenter.test(trimmed)) {
            align.push('center');
          } else if (this.rules.other.tableAlignLeft.test(trimmed)) {
            align.push('left');
          } else {
            align.push(null);
          }
        }

        // Body rows
        const rawRows: string[] = [];
        for (const line of lines) {
          if (!line.trim()) continue;
          if (isContinuationRow(line)) {
            rawRows.push(line);
            continue;
          }
          if (!hasUnescapedPipe(line)) break;
          rawRows.push(line);
        }

        // Check for caption after table (if none found before)
        let afterCaptionLinesConsumed = 0;
        if (!caption) {
          const afterTableIdx = 2 + headerContinuationRows.length + rawRows.length;
          const allLines = src.split('\n');
          // Skip blank lines after the table
          let checkIdx = afterTableIdx;
          while (checkIdx < allLines.length && allLines[checkIdx].trim() === '') {
            checkIdx++;
          }
          if (checkIdx < allLines.length) {
            const captionResult = matchCaption(allLines[checkIdx]);
            if (captionResult) {
              caption = captionResult.caption;
              captionLabel = captionResult.label;
              afterCaptionLinesConsumed = (checkIdx - afterTableIdx) + 1;
            }
          }
        }

        // Determine if we need to handle this table (has advanced features)
        const hasColspan = headerColspanInfo.some(c => c.colspan > 1);
        const hasContinuationRows = useBlockTokens
          || headerContinuationRows.length > 0
          || rawRows.some(rawRow => isContinuationRow(rawRow));
        let hasAdvancedFeatures = hasContinuationRows || hasColspan || caption !== undefined;

        // Check body rows for colspan or rowspan markers
        if (!hasAdvancedFeatures) {
          for (const rawRow of rawRows) {
            if (isContinuationRow(rawRow)) continue;
            const cells = splitCellsWithColspan(rawRow, this.rules.other, count);
            if (cells.some(c => c.colspan > 1)) {
              hasAdvancedFeatures = true;
              break;
            }
            for (const c of cells) {
              if (extractRowspanMarker(c.text) !== null) {
                hasAdvancedFeatures = true;
                break;
              }
            }
            if (hasAdvancedFeatures) break;
          }
        }

        // Let marked's default tokenizer handle standard tables
        if (!hasAdvancedFeatures) {
          return false;
        }

        // Build body rows with colspan detection
        const rows: ExtendedTableCell[][] = [];
        for (const rawRow of rawRows) {
          if (!rawRow.trim()) continue;
          const isContinuation = rawRow.trimStart().startsWith(CONTINUATION_DELIMITER);
          if (isContinuation) {
            if (rows.length === 0) continue;
            const continuationCells = splitColonCells(rawRow.trim(), count);
            const prevRow = rows[rows.length - 1];
            const cellAtColumn: (ExtendedTableCell | undefined)[] = [];
            let currentCol = 0;
            for (const cell of prevRow) {
              for (let c = 0; c < cell.colspan; c++) {
                cellAtColumn[currentCol + c] = cell;
              }
              currentCol += cell.colspan;
            }
            for (let i = 0; i < count; i++) {
              const text = continuationCells[i] ?? '';
              if (text) {
                const cell = cellAtColumn[i];
                if (cell) {
                  cell.text += '\n' + text;
                }
              }
            }
          } else {
            const colspanCells = splitCellsWithColspan(rawRow, this.rules.other, count);
            const row: ExtendedTableCell[] = [];
            let colIdx = 0;
            for (const c of colspanCells) {
              row.push({
                text: c.text,
                tokens: [],
                header: false,
                align: align[colIdx] ?? null,
                colspan: c.colspan,
                rowspan: 1,
              });
              colIdx += c.colspan;
            }
            rows.push(row);
          }
        }

        // Process rowspan markers (^)
        // Phase 1: Detect and strip ^ markers from all cells
        const rowspanFlags: boolean[][] = [];
        for (const row of rows) {
          const flags: boolean[] = [];
          for (const cell of row) {
            const strippedText = extractRowspanMarker(cell.text);
            if (strippedText !== null) {
              cell.text = strippedText;
              flags.push(true);
            } else {
              flags.push(false);
            }
          }
          rowspanFlags.push(flags);
        }

        // Phase 2: Merge marked cells upward (top-down so spans accumulate)
        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
          const currentRow = rows[rowIdx];
          for (let cellIdx = 0; cellIdx < currentRow.length; cellIdx++) {
            if (!rowspanFlags[rowIdx][cellIdx]) continue;

            const cell = currentRow[cellIdx];

            // Find the target cell above (walk up past any already-spanned cells)
            let targetRowIdx = rowIdx - 1;
            while (targetRowIdx >= 0 && rows[targetRowIdx][cellIdx]?.rowspan === 0) {
              targetRowIdx--;
            }
            if (targetRowIdx < 0) continue;
            const targetRow = rows[targetRowIdx];
            if (cellIdx >= targetRow.length) continue;
            const targetCell = targetRow[cellIdx];

            // Only merge if colspan matches
            if (targetCell.colspan !== cell.colspan) continue;

            // Merge content upward
            if (cell.text) {
              targetCell.text += '\n' + cell.text;
            }
            targetCell.rowspan += cell.rowspan;
            cell.rowspan = 0; // Mark as spanned-into
          }
        }

        // Build header cells with colspan
        const header: ExtendedTableCell[] = [];
        for (const info of headerColspanInfo) {
          const idx = header.length;
          // Use merged header text (with continuation rows applied)
          const text = headerCells[idx] ?? '';
          header.push({
            text,
            tokens: tokenizeCells(this.lexer, text),
            header: true,
            align: align[idx] ?? null,
            colspan: info.colspan,
            rowspan: 1,
          });
        }

        // Tokenize body cells (skip spanned-into cells)
        for (const row of rows) {
          for (const cell of row) {
            if (cell.rowspan === 0) continue;
            cell.tokens = tokenizeCells(this.lexer, cell.text);
          }
        }

        const consumedLineCount = (captionLineConsumed ? 1 : 0)
          + 2 + headerContinuationRows.length + rawRows.length + afterCaptionLinesConsumed;
        const raw = src.split('\n').slice(0, consumedLineCount).join('\n');

        const token = {
          type: 'table' as const,
          raw,
          header,
          align,
          rows,
          caption,
          captionLabel,
        };

        return token;
      },
    },
    renderer: {
      table(token) {
        const tableToken = token as Tokens.Table & { caption?: string; captionLabel?: string };

        const idAttr = tableToken.captionLabel ? ` id="${tableToken.captionLabel}"` : '';
        let output = `<table${idAttr}>\n`;

        if (tableToken.caption) {
          output += `<caption>${tableToken.caption}</caption>\n`;
        }

        // Render header
        output += '<thead>\n<tr>\n';
        for (const cell of tableToken.header) {
          const extCell = cell as ExtendedTableCell;
          if (extCell.rowspan === 0) continue;
          output += renderCell(extCell, this, true);
        }
        output += '</tr>\n</thead>\n';

        // Render body
        if (tableToken.rows.length > 0) {
          output += '<tbody>';
          for (const row of tableToken.rows) {
            // Check if all cells in the row are spanned-into
            const allSpanned = row.every((c: Tokens.TableCell) => (c as ExtendedTableCell).rowspan === 0);
            if (allSpanned) continue;
            output += '<tr>\n';
            for (const cell of row) {
              const extCell = cell as ExtendedTableCell;
              if (extCell.rowspan === 0) continue;
              output += renderCell(extCell, this, false);
            }
            output += '</tr>\n';
          }
          output += '</tbody>';
        }

        output += '</table>\n';
        return output;
      },
    },
  };

  function renderCell(
    cell: ExtendedTableCell,
    renderer: { parser: { parseInline(tokens: Token[]): string; parse(tokens: Token[]): string } },
    isHeader: boolean,
  ): string {
    const tag = isHeader ? 'th' : 'td';
    const attrs: string[] = [];
    if (cell.align) {
      attrs.push(` align="${cell.align}"`);
    }
    if (cell.colspan > 1) {
      attrs.push(` colspan="${cell.colspan}"`);
    }
    if (cell.rowspan > 1) {
      attrs.push(` rowspan="${cell.rowspan}"`);
    }
    const content = useBlockTokens
      ? renderer.parser.parse(cell.tokens)
      : renderer.parser.parseInline(cell.tokens);
    return `<${tag}${attrs.join('')}>${content}</${tag}>\n`;
  }

  return extension;
}
