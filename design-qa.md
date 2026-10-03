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
