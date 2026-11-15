import { lookup } from 'node:dns';
import { isIP } from 'node:net';

import ipaddr from 'ipaddr.js';
import { Agent, fetch } from 'undici';

const isPublicAddress = (address: string) =>
  ipaddr.isValid(address) && ipaddr.process(address).range() === 'unicast';

// Validate the addresses passed to the socket, not a separate DNS preflight.
const dispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) {
          callback(error, '', 0);
        } else if (
          !addresses.length ||
          addresses.some(({ address }) => !isPublicAddress(address))
        ) {
          callback(new Error('Non-public embed destination'), '', 0);
        } else if (options.all) {
          callback(null, addresses);
        } else {
          callback(null, addresses[0].address, addresses[0].family);
        }
      });
    },
  },
});

/** Manual redirects ensure every destination goes through the same filtering. */
export const protectedFetch = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  // IP literals bypass Node's lookup callback.
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (isIP(hostname) && !isPublicAddress(hostname))
  ) {
    throw new TypeError('Non-public embed destination');
  }
  const response = await fetch(url, {
    dispatcher,
    method: 'GET',
    headers: { Accept: request.headers.get('accept') || 'text/html' },
    redirect: 'manual',
    signal: request.signal,
  });
  const headers = new Headers();
  for (const name of ['content-type', 'location']) {
    const value = response.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  if ([204, 205, 304, 301, 302, 303, 307, 308].includes(response.status)) {
    await response.body?.cancel();
    return new Response(null, { status: response.status, headers });
  }
  // Undici uses Node's stream typings; Response uses the DOM typings.
  return new Response(
    response.body as unknown as ReadableStream<Uint8Array> | null,
    { status: response.status, headers },
  );
};
