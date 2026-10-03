# Photo-to-map roadmap

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

- 已实现：三种导出风格的大小 / 角度构图、即时预览与恢复默认；地图画幅裁切和独立文案排版。
- 已实现：窄桌面工具栏折叠、按钮宽度与开关对齐修复、照片库初始读取提示。物理手机下载 / 系统分享 / 打印验收仍待完成。
