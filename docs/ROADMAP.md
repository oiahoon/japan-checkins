# Photo-to-map roadmap

## Delivered foundation
- Generalized branding and photo-first check-in panel.
- GitHub source project, Codex instructions, documented auth/storage boundaries.
- Existing owner-isolated persistence, upload retry and curated provenance preserved.

## Delivered: local EXIF proposals
1. Parse bounded JPEG EXIF in-browser BEFORE canvas conversion, retaining only a proposed GPS/date in ephemeral state. No original EXIF sent to server.
2. Validate finite lat/lon ranges and actual dates; missing/malformed metadata offers manual selection. Point-in-polygon against GeoJSON proposes a prefecture; outside Japan is explicitly unsupported at first.
3. Display location/date proposal and an explicit confirm/edit step. Multiple photos with conflicting locations require separate proposed visits; never silently assign all to one place.
4. Add optional confirmed lat/lon to checkins through a new migration, validate server-side, render a true marker plus existing prefecture overview. Existing records remain location-less.
5. Test synthetic GPS, no GPS, invalid TIFF offsets, boundaries, date timezone ambiguity, multiple locations, save/reload/retry and ownership.

已实现上述单地点流程；每张照片建议独立显示，不同地点需分别打卡。自动拆分多地点批次尚未实现。

## Delivered: private GitHub self-hosting implementation

The chosen release mode is a single-owner private web journal. Next.js is now the default runtime; the old Sites adapter is retained separately. Implemented GitHub OAuth state/PKCE, server-verified numeric owner and signed sessions; private GitHub index/photo persistence; owner validation; non-forced atomic Git commits and bounded conflict retry; stable upload/save IDs; authenticated photo reads; configuration template, Vercel build configuration, CI and deployment guide.

EXIF proposals remain local for privacy; Actions runs code validation, not personal-photo processing. No credentials, personal Site or old data migration were introduced. Synthetic tests and local builds verify the core implementation. Actual OAuth, GitHub private writes, mobile use and Vercel deployment require deployer configuration and remain unverified.

Next: real deployment acceptance; then saved-record deletion/export and scalable photo retention as needed. Global geography, offline mode and multi-location automatic splitting remain planned.

## Delivered: configurable visibility and password access

Default password login replaces required OAuth setup. Private mode accepts administrator or read-only visitor password; public mode serves only records explicitly published by the owner. Drafts, old records and private-only status aggregates remain private. Administrative APIs always require administrator access. Added salted password hashing, session revocation on password/provider changes, production WAF configuration guard, publishing controls, and role/public projection tests. GitHub OAuth remains optional.

Release acceptance: GitHub/Vercel connection and project WAF are configured. Local browser QA verified administrator/visitor passwords, denied visitor writes, logout, mobile layout, and disabled uploads without storage. Remote build/CI and runtime secret activation are being completed. Private GitHub write acceptance depends on a deployer-supplied repository-scoped token. No original Sites resources have been changed.
