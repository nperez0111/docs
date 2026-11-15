import { type EmbedsOptions } from '@blocknote/embeds';
import {
  type ResolveOEmbed,
  metadataFromOEmbed,
  parseOEmbed,
} from '@blocknote/embeds/oembed';
import { blueskyProvider } from '@blocknote/embeds/providers/bluesky';
import { createOEmbedProvider } from '@blocknote/embeds/providers/oembed';
import { youtubeProvider } from '@blocknote/embeds/providers/youtube';

import { fetchAPI } from '@/api';

export const createEmbedsOptions = (docId: string): EmbedsOptions => {
  const resolve: ResolveOEmbed = async (url, { signal }) => {
    let response: Response;
    try {
      response = await fetchAPI(
        `documents/${docId}/resolve-embed/?${new URLSearchParams({ url })}`,
        { signal },
      );
    } catch (error) {
      if (error instanceof TypeError || signal.aborted) {
        return { status: 'unavailable' };
      }
      throw error;
    }
    if (!response.ok) {
      return { status: 'unavailable' };
    }
    const value = parseOEmbed(await response.json());
    return value ? { status: 'success', value } : { status: 'unavailable' };
  };

  return {
    providers: [
      youtubeProvider,
      blueskyProvider,
      createOEmbedProvider({
        resolve,
        approvedIframeOrigins: ['https://player.vimeo.com'],
      }),
    ],
    resolveMetadata: async (url, options) => {
      const result = await resolve(url, options);
      return result.status === 'success'
        ? { status: 'success', value: metadataFromOEmbed(result.value) }
        : result;
    },
  };
};
