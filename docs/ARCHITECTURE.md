# Architecture

React19/Vinext app on a Cloudflare-compatible Worker. app/travel.tsx owns UI, app/atlas-map.tsx projects GeoJSON into a prefecture overview. Current map marker is approximate regional position, not saved photo GPS.

GET/POST /api/checkins, POST /api/statuses and POST/GET/DELETE /api/photos use app/chatgpt-auth.ts. D1 owner keys scope each query; R2 object reads require authorized DB rows. lib/photo.ts validates JPEG structure and removes EXIF metadata after client canvas conversion. Limits:6 photos/check-in,3MB uploaded JPEG,30 unfinished photo drafts/user.

Local DB initialization after build:
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_misty_masked_marvel.sql
```
Apply once per new local database. Never replay onto an initialized schema. npm run start uses localhost and project-local ignored persistence.

Generic hosting migration must replace trusted Sites header auth with signed sessions/OIDC verification, configure D1/R2 privately and remove unused Sites connector adapter as appropriate. No cloud provider resources or integrations are created by this export.
