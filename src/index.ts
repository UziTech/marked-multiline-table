import type { MarkedExtension, Token, Tokens } from 'marked';

export interface MultilineTableOptions {
  useBlockTokens?: boolean;
}

const CONTINUATION_DELIMITER = ':';

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
          /-/.test(line) && this.rules.other.tableDelimiter.test(line)
        );

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

        const hasContinuationRows = useBlockTokens
          || headerContinuationRows.length > 0
          || rawRows.some(rawRow => isContinuationRow(rawRow));
        if (!hasContinuationRows) {
          return false;
        }

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
          tokens: tokenizeCells(this.lexer, text),
          header: true,
          align: align[i] ?? null,
        }));

        // Tokenize body cells
        for (const row of rows) {
          for (const cell of row) {
            cell.tokens = tokenizeCells(this.lexer, cell.text);
          }
        }

        const consumedLineCount = 2 + headerContinuationRows.length + rawRows.length;
        const raw = src.split('\n').slice(0, consumedLineCount).join('\n');

        return {
          type: 'table',
          raw,
          header,
          align,
          rows,
        };
      },
    },
  };

  if (useBlockTokens) {
    extension.renderer = {
      tablecell(token) {
        const tag = token.header ? 'th' : 'td';
        const startTag = token.align
          ? `<${tag} align="${token.align}">`
          : `<${tag}>`;
        const endTag = `</${tag}>`;
        const content = this.parser.parse(token.tokens);
        return `${startTag}${content}${endTag}\n`;
      },
    };
  }

  return extension;
}
