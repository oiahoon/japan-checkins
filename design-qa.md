# 暖纸 UI Kit / 2026-10-03

final result: passed

## Visual truth and normalization

视觉依据：用户的 Neumorphism.io 生成器、按钮、开关、圆形确认截图；生成组件 / 应用板 `/Users/huangyuyao/.codex/generated_images/01a0fd6a-e708-7160-8315-274bdc7165b6/exec-c72be4d1-0295-4d77-b1fc-65fd79614051.png`（1536×1024）。用户后续明确“通过光影构造立体和边界而不是使用边框和线条”，优先于概念板上的描边。原有地图 / 中文移动端流程为功能约束。

实际浏览器截图：`/tmp/neo-map-final.png`（1280×720 CSS / pixels），`/tmp/neo-kit-wide-final.png`（1280 CSS 宽，完整滚动页），`/tmp/neo-kit-mobile-final.png`（390×3200，390×844 CSS viewport），`/tmp/neo-map-mobile.png`（390×844），`/tmp/neo-timeline-mobile.png`（390×844），`/tmp/neo-login-mobile.png`（390×844）。均为 1× 密度，无设备边框。临时图像不进入公开 Git。

已打开源图与实际图，并在同一比较图中检查：`/tmp/neo-qa-map-comparison.png` 与 `/tmp/neo-qa-kit-comparison.png`。概念板的地图局部裁切为 746×504，与实际桌面页分别等比例适配 900×608 画布；这是材质、结构对照，不能宣称像素级等同。组件板为小尺寸概念摘要，实验室为可操作的完整滚动页面；其更疏朗的空间、增加说明、原生只读输入和保留既有地理比例属有意应用调整。图形地理与用户后续无描边要求优先于生成稿。

## Findings and comparison history

1. P2：旧全局 input min-height 拉长圆形复选框（24×47），造成椭圆。固定勾选视觉尺寸 / min-height / max-height；最终手机 DOM 实测 24×24，重新截图。
2. P2：桌面分段导航“时间线”折行。为共享分段设置不换行和桌面最小宽度 240；新版截图显示单行导航。
3. P2：增加实验室入口后，侧栏旧空状态 min-height:300 导致说明被滚动区域裁掉。调整空状态高度、图标与页脚；新版桌面图中标题、说明、资料来源与实验室入口完整可见。
4. P1：导出主按钮被历史 `:not(.primary)` 规则覆盖，白文字叠浅底。添加相同层级的明确 primary 选择器，保证朱红底；禁用仍是可读灰色。
5. P2：常态材质仍有历史边框 / 分割线。用户明确要求后，控件、面板、侧栏和输入常态去边框，选择 / 反馈用光影。实验室 14 个面板 / 控件的 computed borderWidth 均为 0px。行政地图边界属于信息而非 UI 边框，保留。

以上问题已修正；最终生产截图与源对照需要在上线后继续核对，以生产交接记录为准。

## Required fidelity surfaces

- 字体：沿用中文宋体 / Georgia 标题和系统无衬线控件，无在线字体依赖；标题、正文和 11–14px 控件标签有层级。桌面导航修正折行；手机表单自然折叠为单列。
- 间距 / 布局：桌面地图 + 侧栏、实验室两列，手机折为单列且保留底部导航。1280 / 390 宽页面无横向溢出；点击 / 键盘地图选择后选择器仍可见。
- 色彩 / 令牌：暖纸 #f3f1eb、墨色 #292c27、朱红 #b84735。统一左上光源，浮起 / 凹陷 / 按压 / 选中有区别，常态无描边；键盘焦点与高对比例外。
- 资产：使用已有真实地图与 Lucide 图标；不复制 Uiverse 源码或截图，不将概念地图作为地理资产，不添加假照片 / 访问记录。所有地理与导出来源契约不变。
- 文案：保持真实 0 次到访 / 存储未配置。实验室标明参数仅影响预览，所有演示不保存记录。精确位置开关显示分享提醒；没有引入自动识别、离线或真实存储已启用的声明。

## Interaction checks

浏览器实际操作开关、勾选、键盘滑杆、pressed 形状、恢复暖纸、深色十六进制输入、导航、示例弹窗 / Escape / 焦点返回、复制状态提示；复制权限失败时有手动选中 CSS 回退。复制成功提示通过，浏览器桥的剪贴板读取未用于声称系统剪贴板内容一致。

实际切换四川、键盘 Enter 选择乐山、切换时间线、打开导出、切换精确落点。原生控件和生产数据流程保持原语义。浏览器控制台未出现错误。登录页原生 form 保留 POST action 与密码自动填充。

`npm run typecheck` / `npm test`（38）/ `npm run build` 通过；主题测试覆盖恶意颜色输入、有界参数、NaN / Infinity、代表性平面颜色 WCAG 前景对比、四种形状和代码输出。

## Follow-up polish / residual gates

- 真实私人 GitHub 保存仍待用户配置数据 token，此轮未写私人旅行数据。
- Safari / 物理 iPhone / 实体打印 / 辅助设备 / OS forced-colors 未验收；仅 CSS 规则和浏览器原生操作，不扩充验收声明。
- 极端凹凸参数仅是实验室材质预览，未作为持久全站主题。

## 追加暗调 / 常用组件验收

用户追加暗调与弹窗 / 开关 / 输入焦点。本轮继续保持同一材质方向，用户的暗调凹陷控件截图为暗调参考，未改变信息架构。

- 最终本机证据：`/tmp/neo-kit-light-final.png`、`/tmp/neo-kit-dark-final.png`（1280 CSS 宽完整页面）；`/tmp/neo-dialog-light-final.png` / `neo-dialog-dark-final.png`（1280×720）；`/tmp/neo-dark-mobile-final.png`（390×844）。暗调新组件已实际操作搜索筛选、原生单选、步进上下界和 Enter 展开。
- P2 修正：暗调首轮仍沿用暖纸预览，白色块打断层次。随主题选择炭纸默认底色，生成器暗表面亮影按亮度降低，不再发白。
- P1 / P2 修正：旧硬编码颜色让暗调地区选择、存储提醒、缩放按钮与导出标签过暗；统一前景 / 次要色。移除导出按钮 `:not(.primary)` 的历史描边。
- 弹窗在双主题下采用浮起外表面 + 凹陷内容区；取消 / 确认清晰，原生 Escape 和焦点返回保留。开启开关通过滑块位置、朱红及中心亮点表示，轨道同色凹陷；输入焦点使用凹陷、光标与淡轮廓。
- 暗调选择在同源新页面保持；桌面与 390 手机地图 / 导出界面已渲染，无横向溢出与控制台错误。导出的图片保持暖纸，不随屏幕主题改变。
- 新控件未连接旅行记录接口，生产实际私人保存验收仍等待存储配置。

## Production receipt

实现提交 `f863256`：两项 GitHub CI success、Vercel success。正式域名实际截图 `/tmp/neo-production-dialog-light.png` / `/tmp/neo-production-dialog-dark.png`（1280×720）、`/tmp/neo-production-map-dark.png`（1280×720）。线上操作双主题弹窗 / 开关与地图乐山键盘选择，导出按钮为 0px border + #ac4b37 / white。控制台无错误。认证和真实数据存储的边界仍保持；无私人写入。final result: passed。

## 2026-10-03 interaction polish

参考为用户四张实际生产截图：暗调重置按压发白、放大 hover 发白、系统下拉、足迹 tab 无动画。临时截图不进入 Git。

- P1 fixed: dark map base fill had higher specificity than hover. Theme-aware hovered / focused fill restores visible geographic feedback. Local actual pointer hover in 甘孜州 settled to #849776.
- P2 fixed: legacy hardcoded light control backgrounds overrode dark pressed / hover. Zoom, reset, neutral export, timeline tools, stepper, shapes and list controls now share surface tokens. Pointer-hover zoom stays dark and reset click preserves map selection. Held-pointer active appearance was reviewed in CSS; no separate held-state screenshot claimed.
- P2 fixed: dropdown now uses existing Base UI Select, raised popup and recessed highlight / check; no new dependency. Keyboard End → Enter selected 沖縄県 and returned focus; changing scope rendered 21 Sichuan areas. Hidden native change dispatch retained controlled state. Explicit labels preserve accessible names. Popup inside poster dialog is visible and choosing desktop format updates preview. First runtime found unselected labels in first grid column; explicit ItemText class fixed it before release.
- P2 fixed: moving shared thumb (260ms) in desktop navigation, inspector and phone navigation; actual switched transform differs by one cell. Reduced-motion rule disables it.
- Other controls operated: switch, checkbox, radio, stepper, Enter accordion, text input; no console errors observed.
- Mobile 390×844: custom menu, scope switch and navigation operated; document scrollWidth=390. Evidence /tmp/travel-polish-mobile-dark.png and /tmp/travel-polish-mobile-light.png. Desktop 1280×720 also inspected; no private writes performed.

Local outcome: passed for named UI behavior. OS forced-colors / Safari / physical-device and real private storage acceptance remain separate gates. Production verification completed for implementation df69553 on travel.miaowu.org.

Production receipt df69553: GitHub verify/build and Vercel success. Actual domain custom menu, scope change, dark zoom hover (#343a37 with #e5e5da foreground), map 甘孜州 hover (#849776), reset click and navigation thumb 260ms / translate 117.5px verified. Dual-theme kit menus operated; mobile 390×844 scrollWidth=390. No production console errors observed. Evidence: /tmp/travel-polish-production-menu.png, /tmp/travel-polish-production-hover.png, /tmp/travel-polish-production-kit-dark.png, /tmp/travel-polish-production-kit-light.png, /tmp/travel-polish-production-mobile.png. Final result: passed for requested web UI, physical held-state and assistive-device acceptance remain unclaimed.

## Location selector alignment follow-up

User supplied two dark production screenshots showing text-only hover and offset popup. Moved MapPin into the actual trigger, using the complete pill as popup anchor. Location popup matches trigger width and both text columns have 45px inset. Actual local DOM measurements: desktop trigger/popup left=46 right=262, label/item left=91; mobile left=28 right=218, label/item left=73, scrollWidth=390. Both light and dark rendered; typecheck and build passed. No data/authentication changes. Production 3d3162d verified on travel.miaowu.org: trigger and popup both left=46/right=262, current label and item text left=91. GitHub verify/build and Vercel succeeded. Screenshot /tmp/travel-location-aligned-production.png.

## Production storage activation

2026-10-03: existing production deployment redeployed to apply user-supplied sensitive GITHUB_DATA_TOKEN (value never read or logged). Vercel deployment dpl_261GGLoYAGHmz7yXXQUx9REk5fkh Ready, travel.miaowu.org alias verified. Actual owner session showed entry enabled and setup banner absent. Synthetic 640×480 JPEG with no EXIF uploaded through real chooser, reached upload-complete state; detail screen honestly reported no GPS. Restaurant kind and note fields operated without saving. Reload recovered draft; authenticated image completed with expected size. Draft removed through UI; current private repository index has zero photos/checkins/statuses. No invented travel history persisted; synthetic bytes remain recoverable in Git history. Actual check-in save not claimed. Existing typecheck, 38 tests and build passed; tests cover metadata stripping, malformed GPS, consent, ownership and retry. Evidence /tmp/travel-storage-enabled-form.png and /tmp/travel-storage-enabled-entry.png.


## 2026-10-03 photo library and three export styles

Flow: upload -> private photo record -> click a card -> save partial information or explicitly confirm location/date -> photo library / map. Export: map -> collect travel map -> choose paper / night / memories -> adjust scale/caption/format -> preview and PNG generation.

Reference: the user's two mobile upload screenshots and the three selected poster concepts. Kept the paper / charcoal palettes, large real geographic silhouettes and memory-style bottom caption. Intentional deviation: generated concept geography and fictitious visited areas are replaced with actual licensed boundary data and user-confirmed records. Decorative mountains/bamboo and raster paper texture are not part of this vector implementation. Photos come only from authenticated journal images, not invented travel imagery.

Browser plugin not available; used Codex CUA in-app browser with its built-in locators and viewport controls. Isolated synthetic images and a temporary in-memory adapter exercised actual components at /mobile-qa; that route, adapter, and fixture endpoint were removed before delivery. No production travel records were created or modified during QA.

| Check | Result |
| --- | --- |
| Page identity / nonblank / no framework overlay | Passed |
| Relevant browser errors / warnings | None observed |
| Phone 320 / 390 / 430; tablet 768; desktop 1366 | Rendered; checked dialog/list/export boundaries |
| Partial note save | Remains unmarked, visible on card; no invented visit |
| Unmarked + no-note filters | Combined filters update visible cards |
| Explicit per-photo confirmation | Adds one stable visit; date field updates React state |
| Optional fields | Coordinates/camera info collapsed by default; expanded without horizontal overflow |
| Three styles / photo toggle | Updated preview; memory style enables photo toggle, can turn it off |
| PNG | Canvas generation completed and fallback save link appeared |

Mismatch/fix ledger: desktop settings originally stretched preview and hid export buttons (P1); bounded grid, independent settings scrolling and fixed visible actions fixed it. Native date fill originally updated the DOM without updating state (P1); onInput synchronization fixed and confirmation was exercised. Mobile long coordinates now display six decimals without discarding underlying precision. Upload-in-progress is distinct from server-save-complete; failures remain retryable and can be removed. Legacy album per-photo notes override album notes, including explicit empty notes; regression tested.

Final local result: passed. npm run typecheck, 69 synthetic tests and npm run build. Next file tracing includes the three boundary datasets used for server-side coordinate consistency. No changes to deployed migrations, Site resources, credentials or existing private data.

Evidence outside Git: /tmp/travel-photo-library-final.png, /tmp/travel-photo-editor-final.png, /tmp/travel-export-desktop-final.png, /tmp/travel-export-memories-final.png, /tmp/travel-sichuan-night-final.png. Browser download-event receipt was unavailable; actual file delivery, system share, print, physical iPhone/Safari keyboard and safe-area behavior remain device acceptance gates. No pixel-perfect or real-photo end-to-end production write acceptance is claimed.

Production receipt: implementation 7c4c615, both GitHub workflows success, Vercel production deployment Ready with travel.miaowu.org alias. Owner photo-library page and combinable filters rendered against existing data; no private record mutations. Follow-up polish sets mobile editor controls to 16px to match existing phone form conventions; typecheck and build pass. Physical-device typing and native file/share/print remain unverified.

Final loading polish: the production refresh briefly showed an empty library before the initial request completed; added an explicit loading state. Removed the redundant initial draft replacement, so a late initial read preserves local in-flight uploads.

Follow-up menu / map composition QA: management button inherited full-width quiet-link and squeezed the common-region control to 45px (P1). Explicit content widths and 801–1100px folded menu fix it. Checked 801 / 1100 / 1366 desktop and 390 phone; header and dialog have no horizontal overflow; light and dark themes rendered. Export range keyboard operations exercised 50% / 160%, -36° / 36° / 180° and reset to 100% / 0°. Japan and Sichuan actual geometry rotates inside a fixed map frame; copy stays independent. Regression covers all nine style/format combinations, nested geographic photo clipping, readable counterrotated labels and invalid-number clamping. 70 tests, typecheck and production build pass. Screens outside Git: /tmp/travel-toolbar-wide-final.png, /tmp/travel-toolbar-1100-final.png, /tmp/travel-export-rotation-final.png, /tmp/travel-export-mobile-rotation.png, /tmp/travel-sichuan-rotation-final.png. Temporary QA adapter again removed before build.

## 2026-10-03 export drag composition

Latest brief: directly drag the map in the poster preview; remove rotation and retain scale. Flow tested: open export -> enlarge -> drag map -> release -> center / reset -> generate PNG. App-generated escaped SVG preview moves only its geographic group; copy stays fixed and photos retain their geographic clipping. Final SVG captures the committed position for export. Pointer capture retains movement when the pointer leaves the preview; bounds are ±50% of the fixed map frame. Keyboard arrows, Shift+arrow and Home were operated. No private journal writes or persistence changes.

Used CUA IAB actual components with temporary isolated synthetic fixtures. Desktop 1366×900 and phone viewports 390×844 / 320×700 rendered; Japan photo-memories and Sichuan dark landscape tested. Identity and meaningful content passed, no framework overlay, no relevant console warnings/errors. Actual pointer drag updates position, repeated drag after scale works, center retains scale, reset restores 100% and zero offset. Rotation is absent from UI and output. PNG generation completed with fallback link; native file delivery / share / print and physical touch remain unverified.

Mismatch ledger: mobile generation text / save link initially covered the center control (P1). Put export footer in normal flex layout and reserve its actual height, so preview tools stay above it. Changing composition clears stale generation feedback and save links. No horizontal overflow at 320 or 390px.

72 tests pass, including normalized drag across viewport sizes, bounds and invalid dimensions, output position across all nine template/format combinations, fixed copy and nested geographic photo clipping. Local typecheck and production build pass; temporary QA route and synthetic fixture endpoint removed before delivery. Screens outside Git: /tmp/travel-export-drag-desktop.png, /tmp/travel-export-drag-mobile.png, /tmp/travel-export-drag-sichuan.png. Final rendered result: passed; physical-device acceptance remains separate.

### Photo information summary regression — 2026-10-03

Finding: saved country/region/city was hidden whenever place was blank. No field-loss reproduction in the save/read flow; private production index was inspected for field presence only, without modifying user data. Cards now render available location levels and separate missing specific-place information from map-confirmation status. Editor distinguishes saved information from a confirmed map visit.

Environment: local 127.0.0.1:3000 temporary isolated QA, actual PhotoLibrary / PhotoEditor and journalAPI over a serialized synthetic store; CUA IAB browser available (no external Playwright fallback). 390×844 and 1366×900; light and dark material checked. Page title/route, nonblank content, no framework overlay, zero relevant console errors and screenshots passed. Flow: partial region → edit city/place/date/note → save unconfirmed → reload → reopen retained all fields and no visit → confirm → one visit → no-note filter excludes it. Temporary QA removed before delivery.

Automated: GitHubStore fake Git transport plus actual journalAPI roundtrip checks partial and complete details after a fresh read, empty-note clearing, consent and private exclusion. 76 tests total. Evidence stored outside Git: /tmp/photo-info-partial-mobile.png and /tmp/photo-info-desktop.png. Real user save/edit, physical iPhone and file upload were not exercised in this regression.

### Neomorphic notifications, buttons and concise copy — 2026-10-03

Changes: management / home / trash now use real NeoButton surfaces; remove repeated puzzle / upload / save / export explanations; shared NeoNotification replaces old bordered toast, inline form errors, photo-viewer failure, export feedback and login error. UI Kit has a four-tone notification catalog. Action-specific consent, error and consequence information stays concise and contextual.

Environment: CUA IAB, local UI Kit / login and a temporary development-only Travel/error fixture route. Verified actual viewport widths (320/390/1100/1366), light/dark appearances, long-message wrapping and 44px actions. On selected IAB tabs the viewport capability targeted the UI Kit tab rather than another hidden QA tab; tests used the tab whose DOM width actually changed. No browser fallback.

Checks: correct title/routes, nonblank settled content, no framework overlay; UI Kit console has no warnings/errors. Forced missing image produces expected synthetic 404; forced unconfigured local store produces expected private API 503 and a persistent error with retry. No production writes or genuine photos used. Flow: map controls → home action → success toast disappears after 5s; manager opens; 1100px and 390px menu fold/unfold; puzzle has no redundant sentence. Notification demo error persists beyond 5s → retry produces success → keyboard focus pauses timer beyond 5s → Enter dismisses. PNG generation leaves preview, controls and fallback file link visible. Login error has no old vertical border; viewer load error and editor failure use inline notices with accessible retry/save. Reduced-motion/high-contrast styles implemented, physical OS settings and assistive tech remain untested.

Screenshots outside Git: /tmp/neo-map-buttons-desktop.png, /tmp/neo-map-buttons-mobile.png, /tmp/neo-notifications-mobile-dark.png, /tmp/neo-notifications-mobile-light.png. Temporary route removed before final build.

### Place-first editor and metadata dates — 2026-10-03

Finding: importer picked only DateTimeOriginal, and editor required country / region / city before the main place. Add private dateSource/dateStatus plus a labeled lower-priority digitized date fallback, and put place first with local-name inference and editable parent disclosure. Unknown/ambiguous places remain manual. No original user photo was provided, so the source of EXIF loss in individual real uploads is still unknown.

Flow under test: isolated PhotoEditor → type 福冈 / 博多站 / 鹿儿岛城山展望台 → correct JP parent/city shown without confirmation → 府中 shows Tokyo/Hiroshima candidates → Tab / Enter chooses Hiroshima → clear date → chooser reads synthetic JPEG EXIF → date restores → save unconfirmed → reopen retains information and no map consent. CUA IAB available, no browser fallback. Actual widths 320/390/1366, light/dark, horizontal overflow absent. Correct route/title, meaningful render, no framework overlay, console clean, screenshots passed. Unit/server suite: 84 tests including date-only JPEG/TIFF, privacy, owner, consent, failed save/upload retries and coordinate boundaries. Original reread uses local file parsing only, no storage writes. Browser file chooser was observed to return slowly; future chooser setFiles calls must include explicit bounded timeout. Temporary QA routes and original fixture files remain outside delivery.

Evidence outside Git: /tmp/place-editor-mobile-light.png and /tmp/place-editor-mobile-dark.png. Physical phone keyboards, assistive technology, original Apple/GR/Q3 files and live user save are separate open gates.

Additional interaction: confirm synthetic photo → save → reopen marked state → change to 熊本 → consent clears and save is disabled until re-confirmed. No real map or user record written.
