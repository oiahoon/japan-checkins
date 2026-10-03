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

`place-index.json` 由 `node scripts/build-place-index.mjs` 从上述日本市区町村、完整国内行政地名目录和世界国家名称生成，保留各来源的使用条件（国内名称和边界独立来源见文末）。附常见简体写法；仅辅助填写所属地区，不是地址定位服务，不生成坐标。博多 / 博多区 / 博多駅（站）归属福岡市的辅助别名，参考福岡市官网与官方路线： https://www.city.fukuoka.lg.jp/ 、 https://bunkazai.city.fukuoka.lg.jp/files/NewsBlocks/48063ea5-ecc2-4b83-8122-6a2d61cc0ff8/value01/6d7a89687c0f6e47f2990ce2dc53011d.pdf 。日本政令指定都市已合并，区级名称并不完整；中央区等常见重名需要用户选择。无全球街道 / 商家 / 景点大全。

## 连续探索与日本町村标签

主地图使用经度 / Mercator 纬度连续相机；亚洲为视窗。西沙物理岛屿在主地图按原位显示，导出保留局部放大框。日本 2021 数据的町村标签已改为 N03_004 优先，郡名保存为辅助字段；1751 个 feature 的 ID / 几何不变，非边界年份更新。固定源与校验脚本见 docs/GEOGRAPHY.md。同名地点无确认坐标不自动归属。

## 国内市县扩展与独立许可（2026-10-03）

`china-admin.json`：内地国家统计局2023-06-30目录，经 modood 固定提交6fb5380（仓库WTFPL v2）；台湾内政部2021资料经 taiwan-atlas 2021.9.20镜像，政府资料开放授权条款第1版，镜像程序MIT；香港民政事务总署18区和澳门公开地理分区仅转录名称事实。名称目录含统计区域，不是正式县级行政单位总数；地点索引不推断坐标。

`china-cities.json`：市级主体来自 geoBoundaries gbHumanitarian / HDX，2020，CC BY 3.0 IGO https://creativecommons.org/licenses/by/3.0/igo/ 。市级文件中省直辖单位若采用2017县级来源，其对应衍生部分仍为ODbL；直辖市 / 港澳上级沿用Public Domain省级轮廓；台湾部分依下述政府资料开放条件。各feature保留source / year。`china-districts/{code}.json` 内地区县：© OpenStreetMap contributors / Lee Beryman / geoBoundaries，2017，ODbL 1.0 https://opendatacommons.org/licenses/odbl/1-0/ ，独立衍生数据库继续按ODbL分发。台湾22县市 / 368乡镇：内政部国土测绘中心资料，2021，政府资料开放授权 https://data.gov.tw/license 。已修复拓扑、统一MultiPolygon、四位小数；名称和空间验证失败的来源不猜配。

34省级完整名称不代表全部2026现行区县边界；新资产382市级等 / 2663下级轮廓、未匹配编码与来源清单公开于 china-coverage.json。全部固定URL、原始SHA-256、逐省覆盖和复现命令：https://github.com/oiahoon/japan-checkins/blob/main/docs/CHINA-COVERAGE.md 。应用代码与私人日志不因独立公开地理数据库改变许可；导出仍按原五种地域作品，不自动导出当前任意市县视图。
