# 暖纸 UI Kit v1

2026-10-03。组件实验室 `/ui-kit`：仅主人认证后可访问。参数只影响预览，不改变站点可见性、密码、用户行程或生产主题。由 GitHub → Vercel 与应用一起发布。

## 视觉契约

用户明确选择扁平拟物：**通过光影构成立体和边界，尽量不用边框与线条**。暖纸 `#f3f1eb`、墨色 `#292c27`、朱红 `#b84735`。左上统一光源；普通表面与页面同色。浮起的按钮 / 卡片用右下暗影和左上亮影；输入 / 轨道 / 导航底座用内阴影。按压时转内阴影。常态不描边，不用分割线划分界面。地图行政边界是地理信息，保留；键盘焦点描边与高对比模式是可访问性例外。

三档尺度：控制圆角 12–14 px，面板 20–24 px，登录 28 px。触控目标至少 44 px；圆形确认视觉直径 24 px，标签整行可点击。按钮影 6 / 16 px，面板影 12 / 28 px，凹陷 3 / 7 px。精确位置确认用复选框，导出精确落点用即时开关。餐厅“已吃过”仍由用户单独确认，不从照片推断。

## 文件与组件

- `app/ui/neo.tsx`：原生 HTML 语义的 React 组件。
- `app/ui/neo.css`：令牌、材质与页面适配；在 globals.css 后导入。
- `lib/neo-theme.ts`：配置归一化、明暗色、前景对比与 CSS 导出。
- `app/select-field.tsx`：基于已有 Base UI 的可访问下拉菜单、隐藏原生表单值和居中箭头。
- `app/ui-kit/kit.tsx`：可操作的配置与组件演示，不保存旅行记录。

| 组件 | 主要参数 / 行为 | 使用位置 |
| --- | --- | --- |
| NeoButton | neutral / primary / quiet；loading 禁止重复点击；支持原生 type | 登录、地图收藏、导出、实验室 |
| NeoSurface | raised / inset；普通 section 属性 | 实验室配置与组件卡 |
| NeoInput / NeoTextarea | 原生 input / textarea 属性，凹陷材质 | 登录、确认表单、导出标题、实验室 |
| SelectField | 兼容现有 select 属性和 change 事件；浮起菜单、选中勾号、长列表滚动 | 地区、类型、年份、画幅 |
| NeoSegmented | label / value / options / onChange；aria-pressed | 主导航、实验室 |
| NeoCheckbox | 原生 checked / disabled / onChange；明确确认 | 地点日期确认、餐厅已吃过、实验室 |
| NeoSwitch | 原生复选框 + role=switch；即时切换 | 导出精确落点、实验室 |
| NeoRange | label / value / min / max / step / unit | 材质参数、进度演示 |
| NeoBadge | neutral / accent / success | 实验室语义状态 |
| NeoNotice | success / error；原生 div 属性与可选 role | 实验室反馈；生产提示保持实际业务含义 |
| NeoProgress | 原生 progress 属性 | 实验室；实际上传仍使用原生进度条 |
| NeoDialog | 原生 dialog + ref；showModal / close / Escape | 实验室，生产弹窗继续使用现有对话框生命周期 |

示例：

```tsx
<NeoButton variant="primary" loading={busy} onClick={save}>保存到访</NeoButton>
<NeoCheckbox checked={confirmed} onChange={e => setConfirmed(e.target.checked)}>
  我已确认坐标、地区和到访日期
</NeoCheckbox>
```

## 配置范围

底色仅接受 6 位十六进制；大小 80–240 px、圆角 0–80 px、距离 1–24 px、强度 2–30%、模糊 2–60 px；形状 flat / concave / convex / pressed。NaN / Infinity / 越界输入归一化。代码输出包括宽高、背景、前景、圆角和双阴影。前景在黑白间选择，以维持平面预览的正文对比；凹凸渐变极端参数仅用于材质探索，不能自动当作全站已验收主题。

参数实时更新预览和可选中文案。复制依赖浏览器剪贴板权限；失败保留完整可选中 CSS 并提示手动复制。恢复暖纸重置参数。示例开关 / 输入 / 确认只在页面内保留，刷新恢复。示例按钮的短暂加载和确认不会请求记录接口。

## 页面应用与 UX

地图工作区形成一张浮起的纸，工具浮在地图上；导航有凹陷底座，选中页签浮起。側栏与地图以阴影衔接，状态提醒凹入纸面。手机保留地区切换、地图和底部导航，侧栏可展开。时间线卡片、照片确认输入、导出与密码登录沿用同一材质。

用户已有的数据、认证、所有权、图片去元数据、EXIF 提议 / 显式确认及幂等保存逻辑不变。生产私人 GitHub token 尚未配置，不能上传 / 保存；实验室不提供存储、认证或公开设置开关。

## 状态与可访问性

常态 / 悬停 / 按压 / 选中 / 禁用 / 加载 / 焦点；开关与复选框有形状和勾号，不单靠阴影或颜色传达状态。禁用无浮起交互暗示。自定义下拉菜单、原生滑杆、输入、对话框保留键盘操作；焦点有朱红外轮廓。prefers-reduced-motion 关闭控件动效；prefers-contrast:more / forced-colors 改为系统轮廓，关闭阴影，不牺牲操作可见性。实际辅助设备、高对比 OS 和 Safari 仍需设备验收。

## 参考与许可

[Neumorphism.io](https://neumorphism.io/#e0e0e0) 的配置生成器；[Uiverse Neumorphism](https://uiverse.io/elements?tags=neumorphism) 与用户提供的 ke1221 按钮、mobinkakei 开关、shreyasm-dev 勾选、Prasado07 凹陷示例。Uiverse 页面标明组件 MIT，但本轮仅借鉴用户选定的视觉语言，**没有复制其组件源码**；没有捆绑第三方截图为运行时资产。

使用已有 Lucide 图标、系统中文宋体标题 / 无衬线正文；没有引入图像背景、假照片或生成的地理资产。生成的概念板是材质参考，实际地图始终使用项目已记录来源的地理数据。完整概念提示与本轮比对见 design-qa.md；临时图像在 Git 外。

## 暗调与组件扩展

暗调为炭纸 `#292c2c`，墨色前景 `#e5e5da`，次要文字 `#acb2a8`，强调 `#d77860`；动作按钮用更深朱红确保白字对比。亮影仅比表面略亮，不用白色光晕。页面右上月亮 / 太阳切换，保存在本机 `travel-theme`；首次未选择时跟随系统初始偏好。登录 / 地图 / 时间线 / 表单 / 导出 / 实验室共用主题。导出的收藏图片仍为暖纸作品，屏幕暗调不改变打印配色。CSS 首屏脚本尽早应用主题；实验室的材质预览会随切换选择对应默认颜色，但手动参数仍只影响预览。

追加 NeoRadio（原生单选）、NeoAccordion（原生 details / summary）、NeoStepper（有界数字步进）；实验室提供可过滤的搜索输入和标签结果。步进达到上下界禁用按钮，单选与折叠支持键盘。开启的开关保留凹陷同色轨道，用有位置差异的朱红滑块和中心亮点表示开启；输入焦点深化凹陷、朱红光标和淡轮廓；弹窗增加内凹正文区、取消 / 确认动作和柔焦遮罩。均不修改真实行程。

## 交互打磨（2026-10-03）

地图放大、重置、图标按钮、步进器及历史列表统一使用主题令牌的 hover / pressed 材质，暗调不再闪白；地图行政区 hover / 键盘焦点用主题对应的填充与地理轮廓反馈。分段导航、足迹页签及手机导航共享 260ms 滑块过渡；减少动态效果偏好关闭动画。

SelectField 使用项目已有的 `@base-ui/react/select`，不是系统弹出菜单。支持方向键、Home / End、键入查找、Enter 选择和 Escape 关闭，菜单列表有界滚动，长名称可换行；保持原生隐藏 select 的表单值和 change 事件。调用者提供明确 aria-label 或关联 id 标签。普通页面通过 Portal 避免地图裁切，原生 dialog 内使用 dialog 容器，保持顶层显示与焦点约束。

地点选择器对齐修正：MapPin 放进 Select.Trigger，整个胶囊为同一个 hover / 点击目标和定位锚点；菜单宽度与锚点一致，文字列保持相同的 45px 左缩进。桌面 216px、手机 190px，其他表单选择器保持原样。
