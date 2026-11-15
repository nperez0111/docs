import { blueskyProvider } from '@blocknote/embeds/providers/bluesky';
import fetchMock from 'fetch-mock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEmbedsOptions } from '../embeds';

describe('embed metadata', () => {
  const url = 'https://example.com/article';
  const endpoint = `http://test.jest/api/v1.0/documents/doc-id/resolve-embed/?${new URLSearchParams({ url })}`;

  beforeEach(() => {
    fetchMock.mockGlobal();
  });

  afterEach(() => {
    fetchMock.hardReset();
  });

  it.each([
    'https://bsky.app/profile/alice.bsky.social/post/3kxyz123',
    'https://bsky.app/profile/did:plc:abcdefghijklmnopqrstuvwx/post/3kxyz123',
  ])(
    'uses the upstream Bluesky provider before the generic fallback: %s',
    (url) => {
      const options = createEmbedsOptions('doc-id');
      const provider = options.providers.find((provider) =>
        provider.matches(new URL(url)),
      );

      expect(provider).toBe(blueskyProvider);
      expect(fetchMock.callHistory.calls()).toHaveLength(0);
    },
  );

  it('does not fetch anything until explicitly resolving metadata', async () => {
    const options = createEmbedsOptions('doc-id');
    expect(fetchMock.callHistory.calls()).toHaveLength(0);
    fetchMock.get(endpoint, {
      version: '1.0',
      type: 'link',
      title: 'Article',
      description: 'Description',
      image_url: 'https://example.com/image.png',
    });

    await expect(
      options.resolveMetadata!(url, { signal: new AbortController().signal }),
    ).resolves.toEqual({
      status: 'success',
      value: {
        title: 'Article',
        description: 'Description',
        imageUrl: 'https://example.com/image.png',
      },
    });
    expect(fetchMock.callHistory.lastCall()?.options.credentials).toBe(
      'include',
    );
  });

  it.each([403, 404, 429, 503])(
    'falls back when the resolver returns %s',
    async (status) => {
      fetchMock.get(endpoint, status);
      await expect(
        createEmbedsOptions('doc-id').resolveMetadata!(url, {
          signal: new AbortController().signal,
        }),
      ).resolves.toEqual({ status: 'unavailable' });
    },
  );

  it('rejects an invalid oEmbed response', async () => {
    fetchMock.get(endpoint, { html: '<script>bad()</script>' });
    await expect(
      createEmbedsOptions('doc-id').resolveMetadata!(url, {
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ status: 'unavailable' });
  });
});
