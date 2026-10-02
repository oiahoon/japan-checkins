# Codex working instructions

Read README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/CONTEXT.md and docs/PROGRESS.md before changes.
Keep durable project context and design decisions in this Git repository. Geography source/coverage and export contracts live in docs/GEOGRAPHY.md.
Preserve Chinese mobile UX and Japanese minimal styling. Primary flow: photo → confirm location/date → save → map/timeline.
Never infer travel history, eaten status or visit depth from a photo. EXIF GPS/date are proposals requiring user confirmation.
Never commit photos, EXIF examples containing real location, credentials, .wrangler state or personal Site identifiers. Use synthetic isolated fixtures only.
Authenticate every record/photo endpoint and enforce owner in every query. Never expose R2 publicly. Header-based ChatGPT identity is safe ONLY behind the trusted Sites gateway.
Do not deploy this repo to generic hosting until server-verified authentication is implemented. Do not alter existing private Site/data/access as part of repository work.
Use additive migrations; never modify a deployed migration. Repeated visits append; retries remain idempotent.
Run npm run typecheck and npm run build. For photo/location work test absent/malformed GPS, boundary cases, consent, metadata stripping, ownership and failed upload/save retry. Prefer bounded browser operations; never wait indefinitely on file choosers.
Keep docs updated with implemented versus planned capabilities. Do not claim automatic location recognition/offline support before implementation and verification.
