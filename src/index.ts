import type { MarkedExtension, Tokens } from 'marked';

const CONTINUATION_DELIMITER = ':';

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

export default function(): MarkedExtension {
  return {
    tokenizer: {
      table(src) {
        const lines = src.split('\n');
        if (lines.length < 2) return false;

        // Header row
        const headerLine = lines.shift();
        if (headerLine === undefined) return false;

        // Header continuation rows (start with ':')
        const headerContinuationRows: string[] = [];
        while (lines.length && lines[0].trimStart().startsWith(CONTINUATION_DELIMITER)) {
          headerContinuationRows.push(lines.shift()!);
        }

        // Delimiter line
        const delimiterLine = lines.shift();
        if (!delimiterLine || !this.rules.other.tableDelimiter.test(delimiterLine)) return false;

        // Parse header cells
        const headerCells = splitCells(headerLine, this.rules.other);
        const count = headerCells.length;

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
        const rawRows = lines.join('\n').trim()
          ? lines.join('\n').replace(this.rules.other.tableRowBlankLine, '').split('\n')
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

        // Tokenize body cells
        for (const row of rows) {
          for (const cell of row) {
            cell.tokens = this.lexer.inline(cell.text);
          }
        }

        return {
          type: 'table',
          raw: src,
          header,
          align,
          rows,
        };
      },
    },
  };
}
