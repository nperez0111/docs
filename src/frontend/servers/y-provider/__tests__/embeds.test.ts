import { ServerBlockNoteEditor } from '@blocknote/server-util';
import { getDocument } from '@blocknote/server-util/dom';
import { describe, expect, it } from 'vitest';

import { docsBlockNoteSchema } from '@/blockSpecs';

describe('embed conversion', () => {
  const editor = ServerBlockNoteEditor.create(
    { schema: docsBlockNoteSchema },
    getDocument(),
  );
  const blocks = [
    {
      type: 'bookmark' as const,
      props: {
        originalUrl: 'https://example.com/bookmark',
        title: 'Saved title',
        description: 'Saved description',
        imageUrl: 'https://example.com/private-preview.png',
      },
    },
    {
      type: 'embed' as const,
      props: { originalUrl: 'https://example.com/video', providerId: 'oembed' },
    },
  ];

  it('preserves bookmark snapshots and embed providers through Yjs', () => {
    const ydoc = editor.blocksToYDoc(blocks, 'document-store');
    expect(editor.yDocToBlocks(ydoc, 'document-store')).toMatchObject(blocks);
    ydoc.destroy();
  });

  it('exports only source links, without remote media', async () => {
    const html = await editor.blocksToHTMLLossy(blocks);
    expect(html).toContain('href="https://example.com/bookmark"');
    expect(html).toContain('href="https://example.com/video"');
    const dom = getDocument().createElement('div');
    dom.innerHTML = html;
    expect(dom.querySelector('iframe, img, script')).toBeNull();
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>'])(
    'exports an unsafe source as inert text: %s',
    async (originalUrl) => {
      const html = await editor.blocksToHTMLLossy([
        { type: 'embed', props: { originalUrl } },
      ]);
      const dom = getDocument().createElement('div');
      dom.innerHTML = html;
      expect(dom.querySelector('a, script, iframe')).toBeNull();
      expect(dom.textContent).toBe(originalUrl);
    },
  );
});
