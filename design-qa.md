# Multi-region release design QA

2026-10-03. Existing accepted Japanese paper/ink/cinnabar interface is the visual source. This is an additive feature release, not an image recreation or brand redesign.

Reviewed actual in-app browser states: Japan retained layout, China region overview with synthetic visits, world country overview, Sichuan city filter, timeline, export dialog on desktop 1280×720 and mobile 390×844. All new geography paths derive from real source data; no generated decorative assets, approximate city pins or imaginary routes. All fixture visits are synthetic and outside the repository.

Fixed before handoff: scope toolbar inherited label margin, desktop map minimum height hiding legend, off-center export dialog, world CN source label mismatch with default selection, repeated disabled city input in Sichuan, stale save toast after scope change. Retained understated control shadows, native selectors, Chinese labels, focus states and mobile sheet navigation.

Functional verification: country/scope selection updates both region detail and timeline; yearly export filters update counts; save retry retains ID; downloaded desktop and phone PNG match requested dimensions and render Chinese copy. Default exports omit private place names, photos, notes and exact points. PNG / SVG generation has no remote imagery. Console has no new runtime errors; the isolated server intentionally returns one save 503.

Limits: browser screen/download validation only. Native sharing, camera/HEIC, actual paper printing and private GitHub writes need deployment-owner/device acceptance. Sichuan city polygons and complete small-country coverage are explicitly planned. Preserve source attribution on maps and exports.

final result: passed (implemented desktop/mobile browser scope)
