# Architecture

## Default: private GitHub journal / Next.js

React 19 / Next.js App Router is the default runtime. `app/page.tsx` verifies a signed session for private viewing, or renders a read-only published view when JOURNAL_VISIBILITY=public. Default AUTH_PROVIDER=password uses salted scrypt hashes (N=131072,r=8,p=1), with separate admin and optional viewer roles. Password changes invalidate old sessions; authentication provider changes do not reuse sessions. Production password login fails closed until Vercel WAF has been configured and PASSWORD_RATE_LIMIT=vercel-waf is acknowledged. Instance-local admission control supplements WAF and is not distributed protection. `app/chatgpt-auth.ts` is the compatibility entry point: self-hosted modes never trust identity headers. `lib/github-auth.ts` verifies HMAC session signature, purpose, numeric owner and expiry. OAuth routes implement GitHub state + PKCE, server token exchange and `/user` identity lookup; only the configured numeric user ID is allowed. OAuth access tokens are discarded after verification, never stored in cookies. Logout is a same-origin POST. HTTPS cookies use the `__Host-` prefix, HttpOnly and SameSite=Lax.

All full-record, status and photo endpoints authenticate and enforce role before using `lib/github-api.ts`. Writes require Origin matching configured `APP_URL`, accept bounded streams and validate input. The service never accepts client-selected repository/owner. `lib/github-store.ts` checks the fixed data repository is private, verifies journal owner and every row owner, then reads `travel/index.json` at a stable commit. Private photos are read from authenticated Git blobs, never static public URLs. Explicit `/api/shared/*` routes are read-only public projections, enabled only in public visibility mode. They exclude drafts, unpublished visits and private status aggregates; photo requests check the published visit in the same snapshot.

The version-1 index contains checkins/statuses/photos, with additive country/published/pref_depth/city_depth fields; country defaults to JP for old records; old records default to unpublished. Owners explicitly confirm publishing each visit, including its note/date/location/photos. Sanitized JPEG files live at `travel/photos/<upload-id>.jpg`. Mutations create a tree and commit based on the observed head and perform a non-forced ref update. Conflicts re-read and reapply at most three times; each network request times out after at most 10 seconds, with a 55-second operation budget. Index and changed photo references enter one commit. IDs are stable across upload/save retry; a lost successful response is recovered by finding the existing ID. Repeat visits use new record IDs. Photos are draft commits before visit confirmation; drafts attach only to their owner's record. Deleting a draft does not erase Git history.

Journal size is capped at 512 KiB, uploaded JPEG at 3 MB, 6 photos/check-in, 30 unfinished drafts. A repository must already have the configured branch. This is a small personal-log store, not a multi-user database. GitHub-side credentials and OAuth configuration remain deployer-owned.

`npm run dev/build/start` uses Next.js; `vercel.json` selects its build. Webpack replaces `cloudflare:workers` with a fail-closed stub for Next.js so the retained Sites adapter cannot read bindings or trust identity there. Actions CI runs typecheck, synthetic tests and build without private credentials or data. Installation and acceptance steps: [SELF-HOSTING.md](SELF-HOSTING.md).

## Photo-to-map flow

GitHub mode uses upload → private photo library → per-photo editing and explicit map confirmation. Partial location/date/notes can be saved without creating a visit. `app/photo-library.tsx` shows missing information and combinable filters; `app/photo-editor.tsx` keeps location/date/notes primary, with coordinates/camera information collapsed below. The retained Sites adapter uses the former two-step confirmation flow. Adopted EXIF coordinates remain unconfirmed until explicit consent; changing the date/region/coordinates revokes that consent. Regions with explicit saved visits are shown as recorded without modifying historical depth or inferring visits from photos. `lib/photo-metadata.ts` reads bounded EXIF locally before canvas conversion. GitHub mode privately retains normalized GPS/date proposals and selected camera metadata, separately from confirmed records; original EXIF is not uploaded. `lib/photo.ts` strips metadata again at upload. Missing/malformed GPS supports manual selection. No timezone guessing: camera date is proposed as-is and offset shown when present. Browser image decoding applies orientation once via from-image.

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

### Photo library / per-photo edits and export templates (2026-10-03)

`app/photo-library.tsx` renders saved and unfinished private photos as one collection with combinable unmarked/no-note filters. `app/photo-editor.tsx` prioritizes region, place, date and note; coordinates and camera metadata use a collapsed disclosure. `app/travel.tsx` synchronizes unfinished photos after edits and management and retains upload failure retries. Upload writes the sanitized image plus optional validated, normalized `proposal` GPS/date and whitelist camera metadata. `details` and `proposal` are additive optional photo-index fields; unfinished photos remain unattached until explicit confirmation.

`PATCH /api/photos/[id]` accepts either existing removal/restoration input or `{details, confirmed}`. The same server session, owner, role, Origin, stream bounds, private-repository and atomic-commit checks apply. `lib/photo-records.ts` supports partial information without creating a visit; confirmed complete information attaches a stable per-photo visit, edits a single-photo visit or separates one photo from a legacy album. Editing revokes publishing so changed private notes/location are not silently exposed. Historical markers and eaten choices are retained. Finite coordinates require confirmation, matching Japan/China provincial geometry; Sichuan additionally checks the city/prefecture. Shared lists omit photo details/proposals/metadata and exclude unfinished photos. Original sanitized image bytes are never rewritten by metadata edits.

`lib/travel-poster.ts` deterministically renders three style families over the same authorized visits and real geometries. It treats the generated concept maps as layout references only. `app/travel-poster.tsx` controls style, title, caption, scale, format and explicit photo/precise-point inclusion. No raster mockup or generated example travel data is shipped. Browser-native PNG/SVG/share/print share one SVG data source, preserving private-photo read gating and geographic clipping.

导出构图由 `buildPoster` 的有界 mapScale / mapOffset 参数实现，旋转已按最新需求移除。位置用固定地图画幅宽高的比例保存，三种风格和三种画幅共享 `posterMapFrame`。地图投影、照片区域 clipPath 与已确认落点置于同一平移组，外层固定画幅裁切避免侵入文案区。非有限数回到默认值；位移限制为画幅宽高的 ±50%。

`app/poster-preview.tsx` 展示由应用生成、XML 转义的 SVG，照片只使用认证读取的已清理 JPEG data URI。预览地图区域捕获 pointer，移动时通过 requestAnimationFrame 更新平移组，松手才提交构图状态并生成最终 SVG；取消手势还原起点。键盘方向键 1% / Shift 5% 微调，Home 居中。ResizeObserver 适配实际预览尺寸。打印隐藏交互图层，使用同一最终 SVG 图片；未确认 proposal、笔记、相机字段不进入导出。手机操作栏参与正常布局，生成提示和保存链接不会遮住居中按钮。

### 2026-10-03 照片信息摘要修正

照片卡片过去只在填入具体地点时展示位置，导致已保存国家 / 地区 / 城市仍显示“地点待补充”。现在使用 `lib/photo-summary.ts` 展示所有已保存的位置层级，缺少具体地点单独提示；“已标记地图 / 尚未确认地图标记”与信息缺失分开。日期优先使用手填值，EXIF 日期仍明确待确认；笔记筛选和显式地图确认规则不变。长位置用省略号和完整 title，图标不被挤压；手机标记提示可换行。编辑框明确显示已保存信息与是否已标记，不把部分保存当作无信息。

实际 GitHubStore 的合成传输测试覆盖 PATCH 编辑 → Git 序列化 → 新 Store 读取 → list 投影，验证部分字段、完整字段、空笔记覆盖及确认前无地图记录；保存链路未复现字段丢失。浏览器在隔离合成数据下验证保存、重新打开、刷新、显式标记、筛选及 390px / 1366px 布局。真实索引仅检查字段存在性，未修改、补全或删除私人照片 / 到访；真实手机仍需设备验收。

### 2026-10-03 通知体系与文案精简

地图“管理记录与照片”“设为常用地区”与回收站改为带图标的拟物按钮，手机 / 平板折叠菜单沿用相同组件。删去拼图底色说明、重复上传 / 保存提示、导出技术解释和查看器手势长句；缺项、明确地点日期确认、错误重试及发布 / 删除 / 精确位置分享的直接后果在对应操作中保留简短信息，数据与权限逻辑未改变。

新增 UI Kit 的 NeoNotification，成功 / 信息 / 提醒 / 错误四态、内嵌 / 浮动、关闭和重试。浮动成功 / 信息默认 5 秒收起，错误与提醒常驻；悬停 / 键盘操作暂停。页面消息、编辑 / 管理 / 查看器 / 导出 / 登录反馈统一；导出区分成功与错误语义。常态用光影而非边框构成边界，亮暗、键盘、减少动态效果与高对比规则见 UI-KIT.md。浏览器本机验证 320 / 390 / 1100 / 1366px，临时 QA 不交付；未改动真实照片 / 行程。物理设备与辅助设备验收仍独立进行。

### Place-first editing and EXIF date diagnostics (2026-10-03)

`lib/place-lookup.ts` searches the local public-name index, lazily loaded by PhotoEditor. Chinese/Japanese aliases resolve country / province / municipality and known Chengdu districts; ambiguous, conflicting and prefix-only names require choosing a candidate. Changing the inferred parent clears incompatible old coordinates, never invents a city-centre point and revokes UI confirmation. Country / region / city remain editable in a collapsed disclosure; unknown names retain manual input. Known photo GPS supplies a boundary-derived proposal when no location has been saved; it never creates a visit.

Date extraction precedes image re-encoding. The exifr importer and bounded JPEG reader prefer DateTimeOriginal, then CreateDate / EXIF DateTimeDigitized (explicitly labeled digitized date, not guaranteed capture date). Shared strict calendar validation keeps the camera's local day and excludes ModifyDate, file/upload dates. Private optional proposal fields dateSource and dateStatus survive index/list roundtrips; missing / invalid / unreadable are distinct, without retaining raw EXIF. Legacy proposals remain readable and shared lists omit these diagnostics. Editor can read a selected original locally to recover a date and offer GPS; it does not re-upload the original or rewrite stored photo bytes. Old sanitized photos cannot recover missing EXIF without the original. Full XMP / IPTC date parsing, arbitrary landmark reverse-geocoding and real iPhone/GR/Q3 fixture acceptance remain unverified/unimplemented.

## 共用布局与自定义作品（2026-10-03）

JournalHeader/JournalMobileNav 从 Travel 中提取，按权限动态生成导航与滑块索引；PageHeader、SheetHeader、PhotoImage 统一排版、44px 目标、加载/失败图槽。布局规则在 journal-layout.css，材质主题在 neo.css。uploadBatchKeys 仅控制当前上传批次显示，历史草稿、认证端点和幂等数据保存不变。

posterStyles 保留 paper/night/memories 内部 ID，更新为独立作品构图。poster-style.ts 校验用户颜色（完整六位 HEX），配置背景、地理底色、强调色，并适配前景；图像 XML 转义不变。TravelPoster 显式传入统计/日期开关，UI 默认关闭；buildPoster 的省略参数默认保留旧统计/日期兼容。所有导出共享最终 SVG。自定义不持久化到私有记录或部署配置。详见布局审阅文档。
