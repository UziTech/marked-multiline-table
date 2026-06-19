import type { MarkedExtension, Tokens } from 'marked';

const CONTINUATION_DELIMITER = ':';

function splitCells(row: string, rules: { findPipe: RegExp, splitPipe: RegExp, slashPipe: RegExp }, count?: number): string[] {
  const cells = row
    .replace(rules.findPipe, (match: string, offset: number, str: string) => {
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

function splitColonCells(row: string, count?: number): string[] {
  // Replace unescaped colons with a sentinel to split on, similar to how
  // marked handles escaped pipes in regular table rows.
  const parts = row
    .replace(/:/g, (match: string, offset: number, str: string) => {
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

export default function(): MarkedExtension {
  return {
    tokenizer: {
      table(src) {
        const result = this.rules.block.table.exec(src);
        if (!result) return false;

        if (!this.rules.other.tableDelimiter.test(result[2])) return false;

        const headerCells = splitCells(result[1], this.rules.other);
        const count = headerCells.length;

        // Parse alignment from delimiter row
        const aligns = result[2]
          .replace(this.rules.other.tableAlignChars, '')
          .split('|');

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

        // Parse body rows
        const rawRows = result[3]?.trim()
          ? result[3].replace(this.rules.other.tableRowBlankLine, '').split('\n')
          : [];

        const rows: Tokens.TableCell[][] = [];

        for (const rawRow of rawRows) {
          if (!rawRow.trim()) continue;

          const isContinuation = rawRow.trimStart().startsWith(CONTINUATION_DELIMITER);

          if (isContinuation) {
            if (rows.length === 0) continue;

            const continuationCells = splitColonCells(rawRow.trim(), count);
            const prevRow = rows[rows.length - 1];

            for (let i = 0; i < count; i++) {
              const text = continuationCells[i] ?? '';
              if (text) {
                prevRow[i].text += '\n' + text;
              }
            }
          } else {
            const cells = splitCells(rawRow, this.rules.other, count);
            const row: Tokens.TableCell[] = [];

            for (let i = 0; i < count; i++) {
              row.push({
                text: cells[i] ?? '',
                tokens: [],
                header: false,
                align: align[i] ?? null,
              });
            }

            rows.push(row);
          }
        }

        // Build header cells with inline tokens
        const header: Tokens.TableCell[] = headerCells.map((text, i) => ({
          text,
          tokens: this.lexer.inline(text),
          header: true,
          align: align[i] ?? null,
        }));

        // Build inline tokens for each body row's cells
        for (const row of rows) {
          for (const cell of row) {
            cell.tokens = this.lexer.inline(cell.text);
          }
        }

        return {
          type: 'table',
          raw: result[0],
          header,
          align,
          rows,
        };
      },
    },
  };
}
