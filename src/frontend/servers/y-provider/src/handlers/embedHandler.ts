import { createEmbedResolver } from '@blocknote/xl-embed-server';
import { Request, Response } from 'express';

import { protectedFetch } from '@/services/protectedFetch';

const resolver = createEmbedResolver({ protectedFetch });

/** Only the authenticated backend can call the outbound resolver. */
export const embedHandler = async (req: Request, res: Response) => {
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  const result = await resolver.fetch(
    new globalThis.Request(`http://resolver.invalid${req.originalUrl}`, {
      signal: controller.signal,
    }),
  );
  res.setHeader('Cache-Control', 'no-store');
  res
    .status(result.status)
    .type('application/json')
    .send(await result.text());
};
