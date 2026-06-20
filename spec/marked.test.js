import { runAllMarkedSpecTests } from '@markedjs/testutils';
import markedMultilineTable from '../src/index.ts';

runAllMarkedSpecTests({
  addExtension(marked) {
    marked.use(markedMultilineTable());
  },
});
