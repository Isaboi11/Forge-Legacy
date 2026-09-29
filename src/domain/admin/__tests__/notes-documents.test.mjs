import test from 'node:test';
import assert from 'node:assert/strict';

import { documentsNote } from '../notes/documents.ts';

test('files and links with a latest change', () => {
  assert.equal(
    documentsNote({ total: 10, links: 2, sizeLabel: '71 MB', latest: { title: 'P&L 2026', daysAgo: 1 } }),
    '8 files and 2 links on file, 71 MB in all. Last change: “P&L 2026”, yesterday.',
  );
});

test('an empty library', () => {
  assert.equal(
    documentsNote({ total: 0, links: 0, sizeLabel: '0 B', latest: null }),
    'Nothing filed yet. Upload the business’s paperwork, or add links to things kept elsewhere.',
  );
  assert.equal(documentsNote(null), null);
});

test('links only: no size sentence, changed today', () => {
  assert.equal(
    documentsNote({ total: 1, links: 1, sizeLabel: '0 B', latest: { title: 'Press kit', daysAgo: 0 } }),
    '1 link on file. Last change: “Press kit”, today.',
  );
});
