# 旅行足迹 · Travel Journal

把照片里的记忆，留在自己的地图上。中文移动端、日式极简与暖纸 / 深墨的光影界面。

**每个人可以 fork 一份，部署在自己的 GitHub Pages 或服务器上，不共用本项目作者的网站或数据。Vercel 可选，旅行数据始终保存在自己的私有 GitHub 仓库。** 不需要 Supabase、D1、R2 或付费地理编码服务。

## 第一次使用，从这里开始

**[新手部署指南：从自己的仓库到第一处足迹](docs/GETTING-STARTED.md)** — 分清两个仓库，按步骤发布、创建授权、添加一张照片、确认信息，再检查地图。

- 想用电脑管理照片、网页查看：选 **GitHub 基础版**。新手指南提供 GitHub Desktop 图形操作，不必输入 Git 命令；地点确认需要编辑 JSON 文件。
- 想在网页上传和管理照片、用密码登录：选 **服务端进阶版**。按引导初始化后部署到 Vercel 或自己的服务器。
- 已经部署过：[升级、备份与回滚](docs/UPGRADING.md)。开发架构和历史验收记录不用在首次安装时阅读。

首次部署不需要 Redis、Geoapify 或自定义域名；先用一张照片跑通流程。以下是两种方案的能力对照与技术步骤。

## 照片加载与旧照片升级

新照片上传 / Git 导入会在同一私仓生成缩略图；列表按可见范围读取，打开大图时暂停后台读取，查看器与导出保持清晰展示图。旧照片可无损兼容，基础版建议补生成缩略图。见[照片加载与补生成说明](docs/PHOTO-LOADING.md)。

## 选择部署方式

| | GitHub 基础版 | 服务端进阶版（Vercel / 自有服务器） |
| --- | --- | --- |
| 网页 | 自己的 GitHub Pages，由 Actions 构建 | 自己的服务端站点 |
| 添加照片 / 修改记录 | Git commit + push，数据仓库 Actions 导入 | 网页上传、编辑、批量管理 |
| 地图 / 时间线 / 查看器 / 导出 | 支持；网页只读 | 支持 |
| 私人数据访问 | 页内存中的私仓 Contents 只读 token | 服务端密码认证，token不交给浏览器 |
| 数据与照片 | 自己的 private GitHub 数据仓库 | 同一个 private 数据仓库，可复用 |
| 只读访客 / 公开投影 / 在线 POI | 不提供 | 可选 |
| Redis / 数据库 | 不需要 | 可选 Redis 写入协调 / 登录限流；批量队列仍在设计 |

### 基础版：用 Git 管理自己的网站

不熟悉命令行，先按[新手指南的图形操作](docs/GETTING-STARTED.md)完成；以下是熟悉 Git 的用户使用的简版步骤。首次使用命令行 Git，请先完成[安装、认证与提交身份准备](docs/GITHUB-BASIC.md#git-preparation)。

1. Fork本项目，在Actions启用工作流；Settings → Pages → Source选GitHub Actions，运行“发布 GitHub 基础版”。
2. 创建private数据仓库（勾选README），把 [导入工作流模板](deploy/github-import.yml) 复制到数据仓库 `.github/workflows/import.yml`。
3. 将照片放进数据仓库 `inbox/`，git commit + push。Actions解析EXIF并生成照片记录；编辑生成的 `travel/import.json`，明确确认地点 / 日期后才标记地图。
4. 在自己的Pages网址用仅授权数据仓库的Contents只读token连接，查看地图、照片、时间线并导出。

基础版网页隐藏并拒绝写入；Actions的内置token只在数据仓库导入任务中使用。Pages只发布应用代码，不打包私人照片。网页只读token不进源码、Cookie或持久存储，刷新要重新连接。

这是无需Vercel的独立网站，**仍需Git操作、Pages启用、导入工作流和私仓授权，不是零配置一键部署**。`inbox/`原图会留在私仓与Git历史；生成的网页JPEG去EXIF不等于清理原始历史。详见 [基础版部署 / 导入 / 确认指南](docs/GITHUB-BASIC.md)。

### 进阶版：Vercel 或自己的服务器

```sh
git clone https://github.com/YOUR_ACCOUNT/japan-checkins.git
cd japan-checkins
npm ci
npm run setup
```

将示例中的 `YOUR_ACCOUNT` 替换为自己的 GitHub 账号；源码仓库改名时同步调整 URL 和 `cd` 目录。Node.js >=22.18。初始化引导填写仓库、隐藏输入的令牌和部署方式，自动生成管理密码、哈希、会话密钥和 `.setup/vercel.env` / `.setup/server.env`，可一次导入配置。密码在 `.setup/admin-password.txt`；这些文件均不提交、不上传。

Vercel需配置登录WAF；自有Node.js服务器可用HTTPS反向代理与持久文件限流，无需Vercel。部署后登录 `/setup` 检查，再点“添加第一张照片”。完整步骤见 [进阶自部署指南](docs/SELF-HOSTING.md)。可选 [Redis写入协调](docs/KV.md) 不改变GitHub主存储、不会自动切换登录限流，后台批次队列仍未实现。

已部署用户请看[升级、备份与回滚指南](docs/UPGRADING.md)：同步 fork、更新服务端，以及维护复制到数据仓库的导入工作流。

## 进阶版：从照片开始

1. 上传照片，立即成为独立的私人照片记录。
2. 读取可用 EXIF 日期 / GPS；缺项手填，通过地点建议补齐所属地区。
3. 补充笔记并明确保存；地点、日期完整且确认后标记到地图。
4. 单张或批量把照片加入旅行相册，也可创建纯文字记忆。
5. 在地图与混合时间线回看；导出三种风格的足迹地图，支持当前国家 / 省市区县范围、自定义文字与配色、拖拽和缩放。

照片不会被用来推断旅行历史、餐厅已吃过或访问深度。批量上传逐张保存，不自动推断 / 合并旅程。

## 主要能力与边界

- 进阶版提供私人密码登录，可设独立只读密码；公开地图只展示主人明确发布的到访。旅行相册 / 文字暂仅私人查看。
- 照片地点、时间、笔记、相机型号等独立保存；支持搜索、筛选、批量管理、回收与恢复、内置查看器。
- JPEG、HEIC/HEIF、TIFF、可解析 TIFF 类 RAW/DNG；RAW 依赖内嵌预览，不做显影。浏览器读取原图 EXIF 后转换 JPEG；服务端清除图片元数据；网页上传不保存原文件。基础版Git导入会保留用户提交的inbox原图和历史，派生JPEG去EXIF。
- 世界 / 亚洲 → 国家 → 已有省市县边界的连续探索；照片拼图裁切在真实边界内。地理覆盖 / 来源年份不是全部现行边界，详见 [GEOGRAPHY](docs/GEOGRAPHY.md) 与 [CHINA-COVERAGE](docs/CHINA-COVERAGE.md)。
- GitHub 保存处理后的 JPEG 和日志索引；基础版由私仓Actions导入并提交，进阶版由服务端即时提交。源码Actions只发布应用，不读取私人数据。
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
