# Architecture

## Default: private GitHub journal / Next.js

React 19 / Next.js App Router is the default runtime. `app/page.tsx` verifies a signed session for private viewing, or renders a read-only published view when JOURNAL_VISIBILITY=public. Default AUTH_PROVIDER=password uses salted scrypt hashes (N=131072,r=8,p=1), with separate admin and optional viewer roles. Password changes invalidate old sessions; authentication provider changes do not reuse sessions. Production password login fails closed until Vercel WAF has been configured and PASSWORD_RATE_LIMIT=vercel-waf is acknowledged. Instance-local admission control supplements WAF and is not distributed protection. `app/chatgpt-auth.ts` is the compatibility entry point: self-hosted modes never trust identity headers. `lib/github-auth.ts` verifies HMAC session signature, purpose, numeric owner and expiry. OAuth routes implement GitHub state + PKCE, server token exchange and `/user` identity lookup; only the configured numeric user ID is allowed. OAuth access tokens are discarded after verification, never stored in cookies. Logout is a same-origin POST. HTTPS cookies use the `__Host-` prefix, HttpOnly and SameSite=Lax.

All full-record, status and photo endpoints authenticate and enforce role before using `lib/github-api.ts`. Writes require Origin matching configured `APP_URL`, accept bounded streams and validate input. The service never accepts client-selected repository/owner. `lib/github-store.ts` checks the fixed data repository is private, verifies journal owner and every row owner, then reads `travel/index.json` at a stable commit. Private photos are read from authenticated Git blobs, never static public URLs. Explicit `/api/shared/*` routes are read-only public projections, enabled only in public visibility mode. They exclude drafts, unpublished visits and private status aggregates; photo requests check the published visit in the same snapshot.

The version-1 index contains checkins/statuses/photos, with additive published/pref_depth/city_depth fields; old records default to unpublished. Owners explicitly confirm publishing each visit, including its note/date/location/photos. Sanitized JPEG files live at `travel/photos/<upload-id>.jpg`. Mutations create a tree and commit based on the observed head and perform a non-forced ref update. Conflicts re-read and reapply at most three times; each network request times out after at most 10 seconds, with a 55-second operation budget. Index and changed photo references enter one commit. IDs are stable across upload/save retry; a lost successful response is recovered by finding the existing ID. Repeat visits use new record IDs. Photos are draft commits before visit confirmation; drafts attach only to their owner's record. Deleting a draft does not erase Git history.

Journal size is capped at 512 KiB, uploaded JPEG at 3 MB, 6 photos/check-in, 30 unfinished drafts. A repository must already have the configured branch. This is a small personal-log store, not a multi-user database. GitHub-side credentials and OAuth configuration remain deployer-owned.

`npm run dev/build/start` uses Next.js; `vercel.json` selects its build. Webpack replaces `cloudflare:workers` with a fail-closed stub for Next.js so the retained Sites adapter cannot read bindings or trust identity there. Actions CI runs typecheck, synthetic tests and build without private credentials or data. Installation and acceptance steps: [SELF-HOSTING.md](SELF-HOSTING.md).

## Photo-to-map flow

`app/travel.tsx` owns a two-step photo → visit confirmation panel with focus moved to each step heading, preserved in-memory edits on back navigation, and a fixed primary action. Optional coordinates, historical depth and curated restaurant details use native disclosure controls. Adopted EXIF coordinates remain unconfirmed until explicit consent; changing the date/region/coordinates revokes that consent. Regions with explicit saved visits are shown as recorded without modifying historical depth or inferring visits from photos. Timeline photos and notes lead; exact coordinates stay behind a disclosure. It owns photo upload/consent/retry UI. `lib/photo-metadata.ts` reads bounded JPEG EXIF locally before canvas conversion, proposes prefecture using point-in-polygon, and validates confirmed coordinates. No raw EXIF is sent to the server. `lib/photo.ts` strips metadata again at upload. Missing/malformed GPS supports manual selection. No timezone guessing: camera date is proposed as-is and offset shown when present. Browser image decoding applies orientation once via from-image.

`app/atlas-map.tsx` projects Japan GeoJSON into a prefecture overview; regional selection is approximate, visit markers use persisted confirmed coordinates. Conflicting photo proposals require separate visits. Photos do not determine status/depth/eaten. Offline saving and global coverage are not implemented.

## Retained: trusted Sites / D1 / R2

`npm run dev:sites/build:sites/start:sites` retains Vinext + Cloudflare bindings. The Vite build explicitly selects Sites mode; it is only valid behind the trusted Sites gateway. Owner keys scope D1 queries, R2 reads require authorized DB rows. The existing migrations remain unchanged; 0001 adds nullable latitude/longitude/location_source. No original Site, resources, access or data have been migrated.

After `build:sites`, initialize each new local database with the additive SQL migrations in order, once each:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_misty_masked_marvel.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_bumpy_marten_broadcloak.sql
```

Do not replay onto an initialized schema. `start:sites` binds loopback and uses ignored project-local persistence. Generic Worker hosting still requires verified authentication rather than trusting Sites headers.
