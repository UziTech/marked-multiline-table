import { Marked } from 'marked';
import markedMultilineTable from 'marked-multiline-table';
import type { MultilineTableOptions } from 'marked-multiline-table';

const marked = new Marked();

const options: MultilineTableOptions = {
  useBlockTokens: true,
};

marked.use(markedMultilineTable());
marked.use(markedMultilineTable({}));
marked.use(markedMultilineTable({ useBlockTokens: false }));
marked.use(markedMultilineTable({ useBlockTokens: true }));
marked.use(markedMultilineTable(options));

const html: string = marked.parse('example markdown', { async: false });
console.log(html);
