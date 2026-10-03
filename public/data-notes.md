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

## Multi-region expansion (2026-10-03)

China/Sichuan outlines use geoBoundaries gbOpen CHN ADM1; world uses Natural Earth 1:110m admin-0. Both source releases are public-domain assets, downloaded and normalized without private data. Exact versions, licenses, caveats, importer and export dimensions are recorded in the repository `docs/GEOGRAPHY.md`: https://github.com/oiahoon/japan-checkins/blob/main/docs/GEOGRAPHY.md . Sichuan has 21 source city/prefecture polygons; Chengdu has 20 historical district polygons with separate provenance below. World low-resolution geometry omits small countries/islands.

四川市州：geoBoundaries gbHumanitarian / HDX CHN ADM2（2020），CC BY 3.0 IGO；本项目筛选、翻译并简化，非来源背书。西沙小岛：Natural Earth 1:10m land，Public Domain；18 个物理岛屿简化多边形及非同比例放大框，不含完整岛礁或海上边界。版本与许可见 docs/GEOGRAPHY.md。

## 日本城市照片拼图

市区町村行政边界：国土交通省「国土数値情報（行政区域）」2021 年，由 SmartNews japan-topography 处理并将政令指定都市合并。本项目投影并将坐标保留 4 位小数，供旅行概览，非现行行政边界测绘。源文件： https://github.com/smartnews-smri/japan-topography/blob/main/data/municipality/geojson/s0010/N03-21_210101_designated_city.json 。

## Chengdu districts

chengdu-districts.json: geoBoundaries gbOpen CHN ADM3 (boundaryID CHN-ADM3-62558664, represented year 2017), Lee Beryman / OpenStreetMap, ODbL 1.0 https://opendatacommons.org/licenses/odbl/1-0/ . Source API https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM3/ ; source commit 9469f09 simplified dataset. Selected 20 Chengdu districts, translated display names, retained sourceName and rounded coordinates. Derived data is distributed under ODbL, separately from application code/private journal. © OpenStreetMap contributors https://www.openstreetmap.org/copyright . Historic reference polygons, not current official administrative/planning boundaries.

## 地点名称索引（2026-10-03）

`place-index.json` 由 `node scripts/build-place-index.mjs` 从上述日本市区町村、中国省份、四川市州、成都区县和世界国家名称生成，保留各来源的使用条件（成都衍生条目为 ODbL）。附常见简体写法；仅辅助填写所属地区，不是地址定位服务，不生成坐标。博多 / 博多区 / 博多駅（站）归属福岡市的辅助别名，参考福岡市官网与官方路线： https://www.city.fukuoka.lg.jp/ 、 https://bunkazai.city.fukuoka.lg.jp/files/NewsBlocks/48063ea5-ecc2-4b83-8122-6a2d61cc0ff8/value01/6d7a89687c0f6e47f2990ce2dc53011d.pdf 。日本政令指定都市已合并，区级名称并不完整；中央区等常见重名需要用户选择。无全球街道 / 商家 / 景点大全。

## 连续探索与日本町村标签

主地图使用经度 / Mercator 纬度连续相机；亚洲为视窗。西沙物理岛屿在主地图按原位显示，导出保留局部放大框。日本 2021 数据的町村标签已改为 N03_004 优先，郡名保存为辅助字段；1751 个 feature 的 ID / 几何不变，非边界年份更新。固定源与校验脚本见 docs/GEOGRAPHY.md。同名地点无确认坐标不自动归属。
