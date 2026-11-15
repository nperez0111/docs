# Experimental bookmarks and embeds

This integration uses [BlockNote PR #3349](https://github.com/TypeCellOS/BlockNote/pull/3349),
not a released BlockNote feature. Paste a single HTTP(S) URL into an empty
paragraph, then explicitly choose **Bookmark** or **Embed**. Ordinary paste and
Docs document links retain their existing behaviour.

## Adopting this change in another fork

1. Apply the editor/schema, export mappings, converter route, and backend action
   together. Both the browser and converter must understand the two new block
   types before documents containing them are opened or exported.
2. Install from `src/frontend` with `yarn install --frozen-lockfile`. The embeds
   and `xl-embed-server` dependencies are pinned to pkg.pr.new commit
   `5a8085fdef88f4902f778f1d0a5c617f3eca5d0e`. Root resolutions pin core and React
   to that same build, preventing duplicate BlockNote extension registrations.
   Keep those resolutions when copying the dependency changes.
3. Rebuild the frontend and converter images and renew their dependency volumes
   in development. Deploy the backend changes too; no migration or additional
   service is required. The existing converter URL and JWT audience are reused.
4. Check the upstream package licences before distributing this integration.
   The experimental XL server is GPL-3.0-or-proprietary; the repository's MIT
   build flag does not remove this new integration.

## Resolution and privacy

The browser calls `GET /api/v1.0/documents/{id}/resolve-embed/?url=…` through the
normal session API. Document read permissions apply, including public readers.
Outbound resolution is limited to 30 requests per minute per authenticated user
or anonymous IP, in addition to normal document throttling. Responses are not
cached by the API or the document service-worker cache.

The backend calls the internal converter's `/api/embeds/` route with an admin JWT
for the `y-converter` audience. Never expose an unauthenticated resolver route.
The published resolver handles time, response-size, and redirect limits; the
Undici transport filters private/reserved IP literals and DNS answers on the
actual socket and uses
manual redirects, including filtering each redirect destination. Browser cookies
and authorization headers are never forwarded to external sites. Keep network
egress restrictions as defence in depth.

Creating a bookmark explicitly fetches metadata and saves a snapshot. Opening a
saved bookmark does not resolve it again, but its preview image can contact the
image host. Live embeds contact external providers when rendered. YouTube and
Bluesky use the PR's dedicated providers before the generic oEmbed fallback.
Bluesky resolves handles through `public.api.bsky.app` without credentials and
renders posts from `embed.bsky.app`. Generic oEmbed iframe output is restricted to
`https://player.vimeo.com`. Other provider output falls back to its source URL.
Extend this exact-origin allowlist deliberately, not with wildcards or arbitrary
HTML execution. DOCX, PDF (Typst), and ODT use the PR's exporter mappings for
static text and safe source links, including saved bookmark titles and
descriptions, never live media.

The upstream experimental chooser currently uses English labels. Offline or
unavailable resolution falls back to a source link. Removing this integration
later requires handling existing `bookmark` and `embed` blocks first; do not
silently remove their schemas from documents that contain them.
