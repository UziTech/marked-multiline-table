import { Marked } from 'marked';
import markedMultilineTable from 'marked-multiline-table';

const marked = new Marked();

const options = {
  // default options
};

marked.use(markedMultilineTable());

const html: string = marked.parse('example markdown', { async: false });
console.log(html);
