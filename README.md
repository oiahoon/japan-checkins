# 旅行足迹 · Travel Journal

把照片里的记忆，留在自己的地图上。中文移动端、日式极简与暖纸 / 深墨的光影界面。

**每个人可以 fork 一份，部署在自己的 GitHub Pages 或服务器上，不共用本项目作者的网站或数据。Vercel 可选，旅行数据始终保存在自己的私有 GitHub 仓库。** 不需要 Supabase、D1、R2 或付费地理编码服务。

## 选择部署方式

| | GitHub 基础版 · 推荐先用 | Vercel 进阶版 |
| --- | --- | --- |
| 网页在哪里 | GitHub Pages，由 Actions 构建 | Vercel |
| 照片和日志 | 自己的私有 GitHub 数据仓库 | 自己的私有 GitHub 数据仓库 |
| 登录方式 | 当前网页连接自己的受限 GitHub token | 密码登录，可设只读密码 |
| 网页上传 / 编辑 / 相册 / 地图 / 导出 | 支持，共用同一套界面和数据格式 | 支持 |
| 本地安装、环境变量 | 不需要 | 引导生成后一次导入 |
| 刷新网页 | 重新连接，不保存令牌 | 密码会话最长24小时 |
| 公开投影 / 在线POI | 不提供，保持私人使用 | 可选 |

### 基础版：只在 GitHub 网页操作

1. Fork 本仓库；在 **Actions** 启用工作流。
2. 在 **Settings → Pages → Source** 选择 **GitHub Actions**；运行 Actions 中的“发布 GitHub 基础版”。完成后点击部署地址。
3. 创建自己的 **private 数据仓库**（勾选 README），创建仅授权这个仓库 Contents 读写的 fine-grained token。在网页填仓库名和 token，开始上传。

Pages 发布的只是应用代码；照片和记录不进入公开源码、Pages文件或Actions。令牌只保存在当前网页内存，不写入源码、Cookie或浏览器持久存储；刷新后重新连接。它是自己的 GitHub 授权凭据，不是共享访问密码。**首次仓库授权仍然必要，fork 本身不会替你授予私仓权限。**

不需要运行命令、不需要 Vercel、不需要给 Actions 配置任何私人密钥。详见 [GitHub 基础版操作步骤](docs/GITHUB-BASIC.md)。

### 进阶版：Vercel 或自己的服务器

```sh
git clone <你的源码仓库地址>
cd japan-checkins
npm ci
npm run setup
```

Node.js >=22.18。初始化引导填写仓库、隐藏输入的令牌和部署方式，自动生成管理密码、哈希、会话密钥和 `.setup/vercel.env` / `.setup/server.env`，可一次导入配置。密码在 `.setup/admin-password.txt`；这些文件均不提交、不上传。

Vercel需配置登录WAF；自有Node.js服务器可用HTTPS反向代理与持久文件限流，无需Vercel。部署后登录 `/setup` 检查，再点“添加第一张照片”。完整步骤见 [进阶自部署指南](docs/SELF-HOSTING.md)。

## 从照片开始

1. 上传照片，立即成为独立的私人照片记录。
2. 读取可用 EXIF 日期 / GPS；缺项手填，通过地点建议补齐所属地区。
3. 补充笔记并明确保存；地点、日期完整且确认后标记到地图。
4. 单张或批量把照片加入旅行相册，也可创建纯文字记忆。
5. 在地图与混合时间线回看；导出三种风格的足迹地图，支持当前国家 / 省市区县范围、自定义文字与配色、拖拽和缩放。

照片不会被用来推断旅行历史、餐厅已吃过或访问深度。批量上传逐张保存，不自动推断 / 合并旅程。

## 主要能力与边界

- 进阶版提供私人密码登录，可设独立只读密码；公开地图只展示主人明确发布的到访。旅行相册 / 文字暂仅私人查看。
- 照片地点、时间、笔记、相机型号等独立保存；支持搜索、筛选、批量管理、回收与恢复、内置查看器。
- JPEG、HEIC/HEIF、TIFF、可解析 TIFF 类 RAW/DNG；RAW 依赖内嵌预览，不做显影。浏览器读取原图 EXIF 后转换 JPEG；基础版在浏览器、进阶版在服务端再次清除图片元数据，原图不进入 GitHub。
- 世界 / 亚洲 → 国家 → 已有省市县边界的连续探索；照片拼图裁切在真实边界内。地理覆盖 / 来源年份不是全部现行边界，详见 [GEOGRAPHY](docs/GEOGRAPHY.md) 与 [CHINA-COVERAGE](docs/CHINA-COVERAGE.md)。
- GitHub 保存处理后的 JPEG 和日志索引；基础版由浏览器直接提交、进阶版由服务端提交，每次保存无需等待构建。Actions 只构建与发布代码，不处理私人照片。
- 适合个人小规模日志：索引512KiB、处理后每张JPEG3MiB、旅行相册100张、单次批量100项；Git历史仍保留曾保存的数据。
- 不提供离线保存、图片视觉定位、同站多人注册、自动旅程合并或永久擦除Git历史。真实机型、Safari、系统分享 / 实体打印的验收边界见 [ACCEPTANCE](docs/ACCEPTANCE.md)。

## 开发与验收

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions 对 fork / clone 执行无私人凭据的安装、合成测试和构建。默认 `npm run dev` / `build` / `start` 为标准 Next.js；旧可信 Sites 适配器保留在 `dev:sites` / `build:sites` / `start:sites`，不会自动迁移其私人资源。

[架构](docs/ARCHITECTURE.md) · [路线图](docs/ROADMAP.md) · [上下文](docs/CONTEXT.md) · [进度](docs/PROGRESS.md) · [UI Kit](docs/UI-KIT.md) · [总验收](docs/ACCEPTANCE.md)
