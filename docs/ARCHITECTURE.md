# Architecture

## Default: private GitHub journal / Next.js

React 19 / Next.js App Router is the default runtime. `app/page.tsx` verifies a signed session for private viewing, or renders a read-only published view when JOURNAL_VISIBILITY=public. Default AUTH_PROVIDER=password uses salted scrypt hashes (N=131072,r=8,p=1), with separate admin and optional viewer roles. Password changes invalidate old sessions; authentication provider changes do not reuse sessions. Production password login fails closed until Vercel WAF has been configured and PASSWORD_RATE_LIMIT=vercel-waf is acknowledged. Instance-local admission control supplements WAF and is not distributed protection. `app/chatgpt-auth.ts` is the compatibility entry point: self-hosted modes never trust identity headers. `lib/github-auth.ts` verifies HMAC session signature, purpose, numeric owner and expiry. OAuth routes implement GitHub state + PKCE, server token exchange and `/user` identity lookup; only the configured numeric user ID is allowed. OAuth access tokens are discarded after verification, never stored in cookies. Logout is a same-origin POST. HTTPS cookies use the `__Host-` prefix, HttpOnly and SameSite=Lax.

All full-record, status and photo endpoints authenticate and enforce role before using `lib/github-api.ts`. Writes require Origin matching configured `APP_URL`, accept bounded streams and validate input. The service never accepts client-selected repository/owner. `lib/github-store.ts` checks the fixed data repository is private, verifies journal owner and every row owner, then reads `travel/index.json` at a stable commit. Private photos are read from authenticated Git blobs, never static public URLs. Explicit `/api/shared/*` routes are read-only public projections, enabled only in public visibility mode. They exclude drafts, unpublished visits and private status aggregates; photo requests check the published visit in the same snapshot.

The version-1 index contains checkins/statuses/photos, with additive country/published/pref_depth/city_depth fields; country defaults to JP for old records; old records default to unpublished. Owners explicitly confirm publishing each visit, including its note/date/location/photos. Sanitized JPEG files live at `travel/photos/<upload-id>.jpg`. Mutations create a tree and commit based on the observed head and perform a non-forced ref update. Conflicts re-read and reapply at most three times; each network request times out after at most 10 seconds, with a 55-second operation budget. Index and changed photo references enter one commit. IDs are stable across upload/save retry; a lost successful response is recovered by finding the existing ID. Repeat visits use new record IDs. Photos are draft commits before visit confirmation; drafts attach only to their owner's record. Deleting a draft does not erase Git history.

Journal size is capped at 512 KiB, uploaded JPEG at 3 MB, 6 photos/check-in, 30 unfinished drafts. A repository must already have the configured branch. This is a small personal-log store, not a multi-user database. GitHub-side credentials and OAuth configuration remain deployer-owned.

`npm run dev/build/start` uses Next.js; `vercel.json` selects its build. Webpack replaces `cloudflare:workers` with a fail-closed stub for Next.js so the retained Sites adapter cannot read bindings or trust identity there. Actions CI runs typecheck, synthetic tests and build without private credentials or data. Installation and acceptance steps: [SELF-HOSTING.md](SELF-HOSTING.md).

## Photo-to-map flow

`app/travel.tsx` owns a two-step photo → visit confirmation panel with focus moved to each step heading, preserved in-memory edits on back navigation, and a fixed primary action. Optional coordinates, historical depth and curated restaurant details use native disclosure controls. Adopted EXIF coordinates remain unconfirmed until explicit consent; changing the date/region/coordinates revokes that consent. Regions with explicit saved visits are shown as recorded without modifying historical depth or inferring visits from photos. Timeline photos and notes lead; exact coordinates stay behind a disclosure. It owns photo upload/consent/retry UI. `lib/photo-metadata.ts` reads bounded JPEG EXIF locally before canvas conversion, proposes prefecture using point-in-polygon, and validates confirmed coordinates. No raw EXIF is sent to the server. `lib/photo.ts` strips metadata again at upload. Missing/malformed GPS supports manual selection. No timezone guessing: camera date is proposed as-is and offset shown when present. Browser image decoding applies orientation once via from-image.

`app/atlas-map.tsx` projects Japan GeoJSON into a prefecture overview; regional selection is approximate, visit markers use persisted confirmed coordinates. Conflicting photo proposals require separate visits. Photos do not determine status/depth/eaten. Offline saving is not implemented. `lib/geography.ts` defines Japan / Sichuan / China / world lenses over one journal. CN records keep province in prefecture and city in city; Sichuan is the CN + 四川省 subset. Non-Japan status keys include country to avoid collisions; Japan legacy labels and place keys remain compatible. The Sites adapter stays Japan-only. See GEOGRAPHY.md for public overview coverage and provenance.

## Retained: trusted Sites / D1 / R2

`npm run dev:sites/build:sites/start:sites` retains Vinext + Cloudflare bindings. The Vite build explicitly selects Sites mode; it is only valid behind the trusted Sites gateway. Owner keys scope D1 queries, R2 reads require authorized DB rows. The existing migrations remain unchanged; 0001 adds nullable latitude/longitude/location_source. No original Site, resources, access or data have been migrated.

After `build:sites`, initialize each new local database with the additive SQL migrations in order, once each:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_misty_masked_marvel.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_bumpy_marten_broadcloak.sql
```

Do not replay onto an initialized schema. `start:sites` binds loopback and uses ignored project-local persistence. Generic Worker hosting still requires verified authentication rather than trusting Sites headers.

## Travel map exports

`app/region-map.tsx` renders real-source Sichuan/China/world geometries with dynamic projection and confirmed visit markers; the original Japan renderer retains its inset. `app/travel-poster.tsx` filters saved visits by year and invokes deterministic SVG generation in `lib/travel-poster.ts`, then renders PNG in browser Canvas. Downloads and optional file sharing run client-side. The default projection omits precise markers, places, photos and notes; users can opt into exact saved points. Public visitors export only their already-authorized public projection. No new data/photo endpoint or publishing permission is introduced. Browser printing uses a dedicated print layout; native share and actual paper/device results require deployer acceptance.

`public/sichuan-cities.json` provides 21 city/prefecture geometries. `chinaMapParts` separates Xisha physical polygons from the mainland overview into an inset, shared by interactive map and poster generation. The canonical Hainan geometry retains those islands for local location proposals. Geographic additions do not change consent, authentication or storage.

## 暖纸组件体系（2026-10-03）

`app/ui/neo.tsx` / `neo.css` 提供原生语义与统一光影，`lib/neo-theme.ts` 提供有界配置和 CSS 生成。`/ui-kit` 由服务器验证主人访问，只提供材质和交互演示，不请求私人记录写入接口，也不修改生产安全 / 主题设置。主导航、登录、照片确认输入 / 复选框和导出使用这些组件。视觉与状态契约见 [UI-KIT.md](UI-KIT.md)。

### 2026-10-03 UI 交互修正

已实现：双主题缩放 / 重置 hover 与按压材质、地图行政区 hover 恢复、Base UI 自定义下拉（长列表 / 键盘 / dialog 层级）、桌面与手机 tab 滑块动画。未新增存储、行程推断或权限能力；此前真实保存等待私人 GitHub token；当前配置与验收状态见下方更新。验收见 `design-qa.md`。

### 2026-10-03 私有 GitHub 存储启用

用户已在 Vercel Production 配置 GITHUB_DATA_TOKEN。重新部署后正式域名显示「记录旅行」，不再显示存储缺失提示。通过线上表单上传无 GPS 的合成 JPEG，成功写入私有仓库；刷新后草稿恢复，认证图片接口读取为 640×480。无 GPS 明确提示手动填写；美食分类、已吃过复选框及笔记可操作。合成草稿已通过页面移除，当前索引 photos/checkins/statuses 均为 0；Git 历史仍保留合成测试版本。未保存虚构行程，真实记录端到端保存 / 地图展示仍待首次真实使用。凭证未读取、未进入 Git。

### 2026-10-03 照片拼图体验上线

主人入口 `/photo-puzzle`：日本四城市随机照片拼图，开关、城市自动聚焦、连续拖拽 / 滚轮 / 按钮缩放、细节层级显示手动笔记。入口由服务端验证主人权限，沙箱 iframe 仅允许脚本；页面内示例不写入真实数据。笔记仅当前页面内存，刷新清空；随机照片不代表到访。此为上线体验原型，真实照片关联、笔记持久化、双指缩放和地图导出尚待接入。源原型在 docs/prototypes/japan-photo-puzzle.html，部署副本在 app/photo-puzzle/demo.ts，修改时同步。

### 多格式照片与相机信息（2026-10-03）

浏览器 exifr 解析 JPEG、HEIC/HEIF、TIFF 与 TIFF 类 RAW/DNG 的 EXIF；最大原图 100 MB，批量串行处理。品牌 / 型号 / 镜头 / 光圈 / 快门秒数 / ISO / 焦距通过白名单、长度和有限正数验证，保存到私有 GitHub 索引照片 metadata（可选字段，旧记录兼容）。主人读取 / 草稿恢复可取得 metadata，公开列表不输出。原图 EXIF 不写入 JPEG；GPS/日期只作待确认建议，不随相机字段保存。

HEIC 原生解码失败时动态加载 heic2any 本机转换；RAW 不做显影，只用可提取的内嵌 JPEG 预览，无预览明确拒绝上传并保留元数据建议。支持不代表所有 RAW 品牌容器、HDR HEIC 或相机机型已实测；真实 iPhone / GR / Q3 文件与移动浏览器验收尚待完成。该持久化适用于当前 GitHub 部署；历史 Sites/R2 路径未扩展相机字段。

### 主地图照片拼图模式（2026-10-03）

已将照片拼图接入主地图工具栏和导出面板，开关默认关闭，导出面板默认继承地图选择并可独立切换。只使用已保存到访所关联的照片，草稿不进入拼图；没有照片的地区保留底色。日本按 2021 市区町村边界匹配明确城市名或已确认坐标（未知城市不扩大到都道府县）；四川按市州，中国按省级地区，世界按国家。照片在实际轮廓内 cover 裁切，单张不平铺，多张使用稳定随机凸凹边。主地图保留拖拽、按钮及滚轮缩放，拼图城市点击后聚焦；放大时只展示手填笔记。

导出照片先经已有认证接口读取并内嵌为 data URI，PNG / SVG / 分享 / 打印使用同一拼图。照片读取失败时阻止导出并给出提示；笔记和相机 metadata 不进入图像，精确落点仍是独立开关。分享前提示照片会包含在文件中。未新增公开照片接口或推断到访。日本城市边界来源和许可见 public/data-notes.md。

验收：合成测试验证草稿排除、城市匹配、单张非平铺、7 张拼块稳定布局、笔记转义及缩小隐藏、默认导出不含照片 / 开启内嵌照片。桌面浏览器验证主地图开关、导出继承与独立切换；手机检查控件布局。本机未配置私人存储，尚未用用户真实照片完成最终保存→拼图→导出验收。独立 `/photo-puzzle` 示例页保留作实验，已移除主页独立入口。

## 成都地区层级与设备偏好

Scope 增加 chengdu，Geographies.chengdu 对应独立 ODbL 区县数据文件。inScope 严格匹配 CN / 四川省 / 成都市，visitArea 优先明确 district，再用已保存确认坐标匹配边界。GitHub schema 添加 district 默认空串，历史 Sites 适配器不扩展。主地图、照片拼图和海报共用地区匹配，避免丢失区县时扩大照片到城市。

travel-home-region 仅是设备 localStorage 的 scope / area 偏好，读取先验证 scope 和已加载地区名单；不改变公开设置、记录和服务端权限。道路 / 地铁图层未实现，见 REGION-LAYERS.md。

## 逐张照片到访（2026-10-03 修正）

上传队列允许每批最多 6 张，但当前保存只提交队列头的一个 photo ID。每张待确认草稿保留其浏览器 EXIF 建议，日期与坐标来自自己的源照片，不写入其他照片记录。确认保存后移除队列头、清空记录 ID / 笔记 / 地点 / 日期，再确认下一张。失败保留原幂等 ID；保存成功而列表刷新失败不会重做保存。每张到访显式核对，GPS 与所选地区存在可判定冲突时拒绝提交。历史多照片结构仍可读取，未自动拆分；旅程合并未实现。

focusedVisit 独立于 expandedVisit：首次点击聚焦地图（无坐标时聚焦已确认地区），再次点击内联显示内容，保留地图交互及可选时间线。

## 站内照片查看器与回收站

PhotoViewer 使用原有认证图片 URL，不创建公开链接。支持 keyboard / touch 切换、1–3 倍缩放、加载失败重试及原生 dialog 焦点约束。时间线、记录内联和上传预览都使用同一查看器。照片重新上传复用逐张确认流程，新增记录而非静默改写旧历史。

GitHub 照片增加可选 removed 布尔字段；旧照片默认可见。PATCH /api/photos/:id 经过主人身份、同源、owner 与 mutation 冲突重试验证，只修改 removed，不删照片文件或到访。普通 / 公开列表和图片读取排除已移除照片；主人列表返回 removedPhotos 标识用于恢复。读取公开快照不暴露回收站。原 DELETE 仅处理未保存草稿，行为保持。历史 Sites 路径未新增回收站，不修改部署迁移。

移动端视图层：Travel 保存聚焦记录、详情 ID 与地图选项展开状态；VisitDetail 使用 native dialog，Photos viewer 可在详情上方打开，重新上传与再记到访关闭详情后进入原确认流程。数据端点及授权不变。TravelPoster 将配置与导出操作区拆开，手机默认预览优先，桌面仍使用两栏。CSS 动态视口和安全区适配，不添加设备定位或推断行为。

批量管理：POST /api/manage 复用 currentAccess / githubAPI 的主人身份、同源和 owner 检查，严格校验 kind(records/photos)、1–100 个 ID 和 removed 布尔值；GitHubStore 单次原子 journal mutation 先验证全部 ID 后更新，重复请求幂等。checkin 增加可选 removed，旧记录默认可见；关联照片的可见性同时依赖 photo.removed 与父记录 removed，不级联修改照片标记。list / shared / blob read 隐藏父记录已移除的照片；回收站内容仅主人 list 提供。删除记录保留历史 statuses 和发布选择，恢复沿用原设置；已单独移除的照片仍隐藏。恢复照片前若父记录已移除，拒绝并提示先恢复记录。旧 Sites 适配器认证后返回 405，未更动既有数据库 / 私人数据。
