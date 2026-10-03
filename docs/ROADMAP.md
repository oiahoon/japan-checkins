# Photo-to-map roadmap

## 最新实现 · 记录与照片双向管理（2026-10-04）

本节优先于历史描述。照片库支持单张 / 批量新建或加入旅行记录、按记录与未归属照片筛选，并把筛选传给批量管理。旅行记录内可选择未加入其他记录的照片，批量移出关联；移出保留照片、单张信息与已确认地图落点。相册笔记与照片笔记分别保存；每条相册 / 每次操作最多 100 张。查看照片或补充单张信息后返回已保存的父记录。相册先展示日期 / 笔记 / 照片，编辑和回收操作折叠；手机全屏、固定动作、沿用暖纸 / 深墨 / 朱红光影语言。

时间线混合展示旅行相册、独立照片和纯文字记忆。已加入相册的照片在该相册展示，不再重复成为独立时间线卡；移出后恢复独立展示。文字记录无需照片，笔记不可为空；记录日期可留空，显示在待补充区域。未确认照片允许按 EXIF 日期建议显示并标明待确认，仍不产生到访。默认全部记忆，主动筛地区时只显示可匹配地域的内容。旧美食类别、已吃过和深度标签保留，均来自已保存的用户选择。

私有 GitHub index 添加 entries 默认空数组，以及 photo.entry 可空字段，checkin 仍负责单张确认落点。旧记录兼容，无迁移 / 自动合并 / 数据改写。记录删除隐藏照片与其地图落点，恢复不覆盖逐张删除状态；旧多照片记录的单张编辑不会丢失相册归属。认证、同源、所有权、原子冲突校验、稳定 ID 和失败重试保持。新相册 / 文字仅私人查看；不提供公开相册，关联会撤回相关旧到访发布，服务端与界面均阻止公开新相册成员。只读用户没有编辑操作，仍不读取未确认草稿。

验收：118 项合成测试覆盖关联冲突、双向关联、幂等、刷新、旧相册拆分、地图确认独立性、回收恢复、父级隐藏、公开与只读保护；本机 typecheck、正式 build 与 diff 检查通过；发布状态以当前提交 GitHub / Vercel 检查为准。浏览器隔离验收覆盖 320 / 390 / 768 / 1280px、明暗、单张 / 批量创建及加入、反向添加 / 移出、照片筛选传递、回收恢复、保存失败保留选择重试、日期回填、相册笔记更新、只读相册和混合时间线。未写入真实私人照片或记录；GitHub 实际相册写入 / iPhone 真机仍单独验收。设计与边界见 [照片与旅行记录](design/photo-records-2026-10-04.md)。

## Delivered foundation
- Generalized branding and photo-first check-in panel.
- GitHub source project, Codex instructions, documented auth/storage boundaries.
- Existing owner-isolated persistence, upload retry and curated provenance preserved.

## Historical foundation: local EXIF proposals (superseded in GitHub mode below)
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
- Fuller country selector / small countries and islands, using verified reusable sources.
- A chosen trip/date interval, optional explicitly-selected photos, and additional map compositions after visual review.
- Saved-record editing/deletion, user-chosen exports/retention; never erase Git history implicitly.
- Physical iPhone/Safari camera, HEIC, native file sharing, wallpaper and actual paper-print checks.

Durable handoff: CONTEXT.md, PROGRESS.md and GEOGRAPHY.md. No Supabase integration or background recurring task was added.

## Delivered: stronger paper relief and geographic detail (2026-10-03)

Controls now share upper-left lighting, raised / pressed states and recessed inputs / segmented selectors. Contrast overrides keep outlines without shadows. Sichuan displays all 21 city/prefecture polygons, click / keyboard selection and zoom labels; exports color only explicitly recorded cities. China preserves 34 province entries and supplements Hainan with 18 Natural Earth Xisha physical-island polygons; the map and exported SVG show a non-proportional inset without shrinking the mainland overview. This is not complete marine / reef coverage or an official administrative map.

### 暖纸 UI Kit v1（已实现）

- 常态用光影形成边界的按钮、输入、选择器、开关、确认、分段、卡片、状态、进度与原生弹窗。
- 主人组件实验室：颜色 / 大小 / 圆角 / 距离 / 强度 / 模糊 / 形状预览与样式复制。
- 地图 / 时间线 / 登录 / 到访确认 / 导出统一材质；保留焦点和高对比模式。
- 后续：Safari / iPhone 原生控件和辅助设备验收；极端自选参数的全站主题持久化未实现。
- 暗调主题与本机偏好、单选 / 搜索 / 步进 / 折叠已实现；导出作品维持独立暖纸构图。

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

### 成都区县试点（2026-10-03）

已实现：中国 → 四川 → 成都 20 区县导航、设备常用地区、加性 district 字段、区县照片拼图和导出。保留 GPS/日期确认与所有权认证。几何为 2017 年参考，非现行官方规划图。全国其他省份目前仅省级选择，后续逐省补市县；道路 / 地铁仅完成许可和接入方案核实，未上线。验收与限制见 REGION-LAYERS.md。

### 逐张上传与手机体验（2026-10-03）

改为每张照片一个独立到访，批量只表示选择 / 上传队列。逐张 EXIF 建议、缺失日期留空、显式核对、坐标与地区一致性检查。记录首次点击聚焦地图，再次点击侧栏内联展开，不自动打开时间线。历史多照片兼容；自动拆分旧记录、旅程聚合和合并暂未实现。已调整手机弹窗高度、相册 / 拍照触达、固定保存动作及照片建议卡。

### 站内照片查看与恢复（2026-10-03）

已实现：站内查看器、前后切换 / 缩放 / 手机滑动 / 键盘 / 失败重试；GitHub 主人照片软删除与回收站恢复；重新上传原图入口复用独立记录确认。旧记录不自动覆盖，照片删除不等于删除到访。尚未实现旅程合并、旧批量记录自动拆分或历史完全擦除。

- 已实现：手机地图主区域、按需设置与自动收起记录抽屉、全屏记录详情和地图导出预览；轻量展开动效与减少动态效果支持。下一步：真实 iPhone Safari 动态地址栏、安全区、分享与触控验收。

- 已实现：主人旅行记录删除、记录 / 已保存照片批量移除与恢复，回收站与关联照片可见性，100 项上限、原子校验和幂等重试。永久删除 / Git 历史清理未实现；旧 Sites 批量管理未扩展。

## Delivered implementation: photo library and export styles (2026-10-03)

- Three selectable map export styles: paper editorial, dark collector, photo memory; real Japan/Sichuan boundaries, caption, scale, A4/desktop/phone adaptation.
- Private unfinished photos immediately enter the photo library. Location/date/notes can be completed later; combinable unmarked/no-note filters and per-photo editing.
- Persist normalized EXIF proposals privately after upload so refresh does not lose suggestions. These remain unconfirmed and excluded from map/public/export history.
- Progressive disclosure for coordinates/camera info, mobile full-screen editing and a fixed save action.
- Stable per-photo visit IDs, consent on changes, owner/role/Origin enforcement; edits revoke publication and retain explicit history choices.
- Pending: actual iPhone/Safari keyboard and share/print verification by the owner; permanent history erasure and journey merging remain outside this change.

Earlier paragraphs describing EXIF proposals as exclusively ephemeral refer to the former upload flow. GitHub mode now stores a bounded normalized private proposal separately from confirmed location; original EXIF and RAW files still never enter the store. Sites remains on its previous flow.

- 已实现：三种导出风格的大小 / 拖拽位置构图、即时预览与恢复默认；地图画幅裁切和独立文案排版。
- 已实现：窄桌面工具栏折叠、按钮宽度与开关对齐修复、照片库初始读取提示。物理手机下载 / 系统分享 / 打印验收仍待完成。

- 最新取舍：移除导出旋转，仅保留大小与拖拽位置；支持地图居中、完整复位和键盘微调。位置随预览进入 PNG / SVG / 打印。

### 2026-10-03 照片信息摘要修正

照片卡片过去只在填入具体地点时展示位置，导致已保存国家 / 地区 / 城市仍显示“地点待补充”。现在使用 `lib/photo-summary.ts` 展示所有已保存的位置层级，缺少具体地点单独提示；“已标记地图 / 尚未确认地图标记”与信息缺失分开。日期优先使用手填值，EXIF 日期仍明确待确认；笔记筛选和显式地图确认规则不变。长位置用省略号和完整 title，图标不被挤压；手机标记提示可换行。编辑框明确显示已保存信息与是否已标记，不把部分保存当作无信息。

实际 GitHubStore 的合成传输测试覆盖 PATCH 编辑 → Git 序列化 → 新 Store 读取 → list 投影，验证部分字段、完整字段、空笔记覆盖及确认前无地图记录；保存链路未复现字段丢失。浏览器在隔离合成数据下验证保存、重新打开、刷新、显式标记、筛选及 390px / 1366px 布局。真实索引仅检查字段存在性，未修改、补全或删除私人照片 / 到访；真实手机仍需设备验收。

### 2026-10-03 通知体系与文案精简

地图“管理记录与照片”“设为常用地区”与回收站改为带图标的拟物按钮，手机 / 平板折叠菜单沿用相同组件。删去拼图底色说明、重复上传 / 保存提示、导出技术解释和查看器手势长句；缺项、明确地点日期确认、错误重试及发布 / 删除 / 精确位置分享的直接后果在对应操作中保留简短信息，数据与权限逻辑未改变。

新增 UI Kit 的 NeoNotification，成功 / 信息 / 提醒 / 错误四态、内嵌 / 浮动、关闭和重试。浮动成功 / 信息默认 5 秒收起，错误与提醒常驻；悬停 / 键盘操作暂停。页面消息、编辑 / 管理 / 查看器 / 导出 / 登录反馈统一；导出区分成功与错误语义。常态用光影而非边框构成边界，亮暗、键盘、减少动态效果与高对比规则见 UI-KIT.md。浏览器本机验证 320 / 390 / 1100 / 1366px，临时 QA 不交付；未改动真实照片 / 行程。物理设备与辅助设备验收仍独立进行。

- [x] 地点优先编辑：本机公共行政名称 / 常用别名补出国家与父级地区，重名候选、手动调整和更换地区清除旧坐标。
- [x] EXIF 日期兼容：原拍摄日期优先、数字化日期待核对兜底；私有读取状态；旧照片可从本机原图补读。
- [ ] 更广泛的城市 / 区县 / 景点名称库（当前名称索引不覆盖全球街道或商家）。
- [ ] iPhone 原图 / 相册导出、GR、Q3 原始文件实测，XMP / IPTC 日期兼容按实际文件证据扩展。

### 全站布局与导出作品 · 2026-10-03

- [x] 共用导航、页面头、弹窗头、照片加载/失败状态；320–1440px 布局审阅与合成数据交互验证。
- [x] 上传当前批次独立展示，详情/查看器操作分层，手机地图与导出预览优先。
- [x] 三种批准作品全部实现：朱印与列岛、夜航图鉴、山河相册；日本/四川优先构图，三种画幅。
- [x] 标题/题记/字体、预设与自选配色、统计/日期/地区标签、自主缩放/拖拽/居中。
- [ ] 持久保存个人导出模板（当前仅会话设置）。
- [ ] 物理 iPhone/Safari/系统分享及实体打印、照片有效打印分辨率验收。

### 2026-10-03 时间线

已实现按月 / 日倒序的旅行日志、多照片入口、长笔记展开、手机折叠筛选、平板图文并排和地图优先联动。待后续：大量记录的分页 / 虚拟化、显式旅程合并（需用户操作），真实手机与辅助设备验收。

## 已实现 · 连续地图探索（2026-10-03）

主地图替换顶部地区下拉，以世界 / 亚洲 / 国家 / 已有行政细节的递进交互导航。日本 1751 市区町村、四川市州、成都区县可下钻；点击自动聚焦、缩放自动换层、路径 / 返回 / 搜索、设备常用地区、连续拖拽和照片模式保留。日本町村名称来源修正、同名归属保护、记录按节点筛选和性能缓存已实现。96 项合成测试及响应式浏览器验收见 map-explorer 报告。

后续仍计划：其他洲的专属视窗、全国市县现行边界的缺口更新、日本政令都市区层、其他国家行政细节、道路 / 地铁、动态更细瓦片、大数据性能策略，以及城市 / 洲级独立导出作品。不得把放大后的原多边形称为街道级或现行行政测绘。真实设备双指 / Safari / 原生分享与打印保持独立验收。

## 地点补充下一步（2026-10-03）

已实现：本地行政区 / 别名提示，轻量所属地区摘要，主保存按钮直接确认地图，缺项保留草稿，可配置受认证 Geoapify 搜索适配器。

待验收：供应商账号注册与 key 配置后，对真实日本 / 中国小地名与 POI 覆盖进行在线验证；物理 iPhone 输入法 / 键盘 / 网络失败。当前发布默认仅本地建议，不能声称完整 POI 搜索或照片视觉定位。规模扩大后补平台全局搜索限流，保留当前实例内预算作为补充。

## 已实现 · 国内目录扩展（2026-10-03）

- [x] 全部现有34省级地区名称，市州 / 直辖县 / 区县全父级目录及繁简别名。
- [x] 全国市县搜索、照片省市区联动、district保存重读、按省懒加载参考几何、无轮廓回退和来源覆盖审计。
- [ ] 更新内地2023之后的区划，逐项核对缺失 / 重组 / 音译差异并引入许可明确的更新边界。
- [ ] 香港 / 澳门下级边界、统计用区域的可靠轮廓；不能以名称齐全声称现行几何齐全。
- [ ] 全国任意市县独立海报投影、街道道路 / 地铁，以及真实手机多指 / 原生分享验收。
