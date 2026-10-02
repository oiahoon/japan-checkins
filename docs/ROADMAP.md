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

## General release
- Auth adapter with verified sessions for arbitrary hosting; deployment configuration and CI.
- Separate public reference data from private user data; retention/delete/export design.
- Expand geographic regions only with appropriate map provenance and UX; Japan dataset is not worldwide coverage.

No paid geocoder, visual recognition API or third-party integration is assumed. Photo appearance alone cannot establish exact coordinates.
