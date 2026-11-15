import {
  bookmarkBlockMapping as bookmarkDocx,
  embedBlockMapping as embedDocx,
} from '@blocknote/embeds/docx-exporter';
import {
  bookmarkBlockMapping as bookmarkOdt,
  embedBlockMapping as embedOdt,
} from '@blocknote/embeds/odt-exporter';
import {
  bookmarkBlockMapping as bookmarkTypst,
  embedBlockMapping as embedTypst,
} from '@blocknote/embeds/typst-exporter';
import { describe, expect, it } from 'vitest';

import { getDocxDocsSchemaMappings } from '../mappingDocx';
import { getOdtDocsSchemaMappings } from '../mappingODT';
import { getPdfDocsSchemaMappings } from '../mappingPDF';

describe('upstream embed export mappings', () => {
  it.each([
    ['DOCX', getDocxDocsSchemaMappings, bookmarkDocx, embedDocx],
    ['ODT', getOdtDocsSchemaMappings, bookmarkOdt, embedOdt],
    ['PDF (Typst)', getPdfDocsSchemaMappings, bookmarkTypst, embedTypst],
  ] as const)(
    'uses the PR mappings for %s',
    (_format, getMappings, bookmark, embed) => {
      const { blockMapping } = getMappings(new Map(), 'Image unavailable');

      expect(blockMapping.bookmark).toBe(bookmark);
      expect(blockMapping.embed).toBe(embed);
    },
  );
});
