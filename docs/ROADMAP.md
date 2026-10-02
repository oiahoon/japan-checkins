# Photo-to-map roadmap

## Delivered foundation
- Generalized branding and photo-first check-in panel.
- GitHub source project, Codex instructions, documented auth/storage boundaries.
- Existing owner-isolated persistence, upload retry and curated provenance preserved.

## Delivered: local EXIF proposals
1. Parse bounded JPEG EXIF in-browser BEFORE canvas conversion, retaining only a proposed GPS/date in ephemeral state. No original EXIF sent to server.
2. Validate finite lat/lon ranges and actual dates; missing/malformed metadata offers manual selection. Point-in-polygon against GeoJSON proposes a prefecture; the first release supported Japan only; the multi-region release now offers China/world proposals after explicit adoption.
3. Display location/date proposal and an explicit confirm/edit step. Multiple photos with conflicting locations require separate proposed visits; never silently assign all to one place.
4. Add optional confirmed lat/lon to checkins through a new migration, validate server-side, render a true marker plus existing prefecture overview. Existing records remain location-less.
5. Test synthetic GPS, no GPS, invalid TIFF offsets, boundaries, date timezone ambiguity, multiple locations, save/reload/retry and ownership.

已实现上述单地点流程；每张照片建议独立显示，不同地点需分别打卡。自动拆分多地点批次尚未实现。

## Delivered: private GitHub self-hosting implementation

The chosen release mode is a single-owner private web journal. Next.js is now the default runtime; the old Sites adapter is retained separately. Implemented GitHub OAuth state/PKCE, server-verified numeric owner and signed sessions; private GitHub index/photo persistence; owner validation; non-forced atomic Git commits and bounded conflict retry; stable upload/save IDs; authenticated photo reads; configuration template, Vercel build configuration, CI and deployment guide.

EXIF proposals remain local for privacy; Actions runs code validation, not personal-photo processing. No credentials, personal Site or old data migration were introduced. Synthetic tests and local builds verify the core implementation. Actual OAuth, GitHub private writes and physical-device acceptance require deployer configuration and remain unverified. Vercel production password login has been verified.

Next: real deployment acceptance; then saved-record deletion/export and scalable photo retention as needed. Full geographic coverage, offline mode and multi-location automatic splitting remain planned.

## Delivered: configurable visibility and password access

Default password login replaces required OAuth setup. Private mode accepts administrator or read-only visitor password; public mode serves only records explicitly published by the owner. Drafts, old records and private-only status aggregates remain private. Administrative APIs always require administrator access. Added salted password hashing, session revocation on password/provider changes, production WAF configuration guard, publishing controls, and role/public projection tests. GitHub OAuth remains optional.

Release acceptance: GitHub/Vercel connection and project WAF are configured. Local browser QA verified administrator/visitor passwords, denied visitor writes, logout, mobile layout, and disabled uploads without storage. GitHub Actions and Vercel production builds have succeeded. The owner authorized production SESSION_SECRET / ADMIN_PASSWORD_HASH activation, and the production administrator password login was verified in the in-app browser. Private GitHub write acceptance depends on a deployer-supplied repository-scoped token. No original Sites resources have been changed.

## Delivered: quiet photo-first interaction refinement

Split the long entry form into photo selection and visit confirmation, retained photo-free entries and in-memory back navigation, folded optional precision/classification/history fields, and moved the primary action into a fixed footer. Timeline cards now prioritize photos and notes, with exact coordinates disclosed on demand. Warm paper, ink and cinnabar styling remains flat and restrained.

In-app browser verification at desktop 1280×720 and mobile 390×844 used an isolated synthetic journal outside the repository: interrupted upload and save recovered with the same IDs, unconfirmed coordinates prevented saving, date editing revoked consent, and uploaded JPEG metadata was removed. The production data token is still deferred; this does not constitute real GitHub write or physical-device acceptance.

## Delivered: aligned native selects and restrained soft controls

A shared SelectField preserves native selection, labels, disabled states and change handlers while replacing the browser-drawn arrow with a 16 px Lucide chevron. Form/timeline arrows use a consistent 16 px trailing inset and vertical centering. The map selector retains its compact icon layout.

Neumorphism is limited to control surfaces: faint inset fields, raised map tools/photo pickers/close buttons, and pressed mobile navigation. Main actions stay cinnabar and flat; photos, prose and panels retain the paper layout. Borders and focus outlines remain visible; increased-contrast / forced-color modes remove shadows. In-app browser screenshots verify desktop and a 390 px viewport; physical-device native pickers remain unverified.

## Delivered: multi-region journal and collectible map (2026-10-03)

日本 / 四川 / 中国 / 世界 views now share the same owner-scoped GitHub journal. Old records default to JP; CN + 四川省 records appear under Sichuan, China and world without duplication. China has 34 province-level outlines; Sichuan has its province outline and 21 city/prefecture filters; world uses 177 Natural Earth features. View all records in the current map or filter one area. Non-Japan records retain confirmed global coordinates; all JPEG parsing, metadata stripping, role guards and retry rules continue.

Export saved visits as a map: custom title, all-time/year, A4/desktop/phone, PNG/SVG, native share or file download fallback, browser print/PDF. Default exports exclude exact markers, notes, place names and photos. Optional exact points are clearly disclosed. Maps do not infer trip order or connect a fictitious route.

Next iterations:
- Real private GitHub write acceptance after the deferred repository token is configured.
- 四川市州 outlines; fuller country selector / small countries and islands, using verified reusable sources.
- A chosen trip/date interval, optional explicitly-selected photos, and additional map compositions after visual review.
- Saved-record editing/deletion, user-chosen exports/retention; never erase Git history implicitly.
- Physical iPhone/Safari camera, HEIC, native file sharing, wallpaper and actual paper-print checks.

Durable handoff: CONTEXT.md, PROGRESS.md and GEOGRAPHY.md. No Supabase integration or background recurring task was added.
