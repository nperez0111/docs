import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { protectedFetch } from '@/services/protectedFetch';

describe('embed outbound transport', () => {
  it.each(['127.0.0.1', 'localhost'])(
    'rejects a loopback socket before sending a request: %s',
    async (hostname) => {
      let requests = 0;
      const server = createServer((_request, response) => {
        requests++;
        response.end('private data');
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      try {
        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Expected TCP listener');
        }
        await expect(
          protectedFetch(
            new Request(`http://${hostname}:${address.port}/`, {
              signal: AbortSignal.timeout(2000),
            }),
          ),
        ).rejects.toThrow(TypeError);
        expect(requests).toBe(0);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );

  it.each([
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://169.254.169.254/latest/meta-data/',
  ])('rejects private and metadata addresses: %s', async (url) => {
    await expect(
      protectedFetch(new Request(url, { signal: AbortSignal.timeout(2000) })),
    ).rejects.toThrow(TypeError);
  });
});
