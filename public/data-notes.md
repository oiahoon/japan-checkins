# Japan Gourmet Map reusable assets

Prepared 2026-10-02 for a private personal Japan food map and photo check-in app.

## Files

- `restaurants.json`: 24 TV-featured restaurants or food facilities across 21 prefectures. Each record preserves TV Tokyo evidence and address/status provenance when available.
- `japan-simple.json`: simplified GeoJSON for all 47 Japanese prefectures, with JIS prefecture IDs and Japanese names. Coordinates are longitude/latitude. The first polygon of each feature is its largest retained polygon.
- `japan-food-map.html`: existing interactive Page fragment, including the same source data. It depends on the Page host's theme utilities and `window.openai.widgetState` / `setWidgetState`; it is a reference implementation, not a standalone production app.

## Data caveats

This is a curated first edition, not a complete episode or restaurant catalog. Missing prefectures mean not yet included, not that the programme has never visited. The map uses prefecture-level restaurant collections; the dots are approximate geographic representatives, not restaurant coordinates. Search links are address queries, not verified navigation destinations.

Historical TV appearances do not prove current operation. As of the 2026-10-02 review, わさび園 かどや's own site reports long-term closure; ニューこのり moved in 2017; 大安食堂 has a recent October 2026 business notice. Other current status is generally unverified. Follow each record's `source`, `addressSource`, `addressNote`, `statusSource` and notes; do not collapse historical addresses, later reference addresses and current addresses into one assertion. 菜名 for 喰い処 まつはま includes a separately labeled secondary source. 舞鶴港 とれとれセンター is a facility entry, not a verified individual stall.

## Geography attribution and license

Source: Geospatial Information Authority of Japan, Global Map Japan (地球地図日本):
https://www.gsi.go.jp/kankyochiri/gm_jpn.html

GeoJSON conversion: dataofjapan/land:
https://github.com/dataofjapan/land

This package further simplifies boundaries, rounds coordinates to three decimals, omits very small islands and interior rings, and orients polygon rings for D3. It is a derivative overview map, not an official GSI map or navigation/administrative-boundary product.

GSI content-use rules and Public Data License 1.0 reference:
https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html

Retain source attribution and disclose modifications when using the geography. The geometry source attribution is separate from TV Tokyo's restaurant/episode factual evidence. No TV photos or programme footage are included.

## Interaction and migration

The HTML includes no user's saved visits or photographs. Empty state means unrecorded, never unvisited. Its state shape is `modelContent.japanFoodMap` with version 1, a prefecture map (`depth`, `note`), city records (`id`, `prefId`, `name`, `depth`, `note`) and restaurant markers (`unknown`, `want`, `eaten`). Depth values are `unknown`, `never`, `transit`, `brief`, `regular`, `deep`.

A standalone private app must replace host-only persistence with authenticated durable storage. Save photo objects separately from check-in records; do not put photo bytes or base64 into this widget state. Keep restaurant facts, visit depth and dated repeat check-ins separate. Existing Page state is file-bound and is not included here; do not claim it has been migrated. The prior fragment's interactions passed DOM simulations, but real Page rendering and cross-session host persistence were not verified.
