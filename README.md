# Japan Check-ins / 日本足迹

照片优先的私人旅行日志，日式极简界面。上传照片、确认地点与日期，然后保存到地图和时间线。重复到访新增记录；城市深度和餐厅已吃过状态相互独立。

## 当前能力

- 照片入口位于打卡表单最前面；相册多选、手机相机入口、上传进度与失败重试。
- 47都道府县概览、24家电视精选餐厅、任意城市/街道/地点。
- D1记录、私人R2照片、逐用户所有权检查；照片缩小和移除EXIF。
- 目前需手动确认地区、地点和日期；没有实现EXIF地点自动识别，不能离线保存。

## Codex 本地项目

在Codex桌面选择此仓库的本地文件夹作为项目，并从AGENTS.md和docs/ROADMAP.md开始任务。此仓库提供项目代码和持久开发说明，不会自动创建Codex云端Environment。

```sh
git clone git@github.com:oiahoon/japan-checkins.git
cd japan-checkins
npm ci
npm run typecheck
npm run build
npm run dev
```

Node>=22.13。开发预览具有本地模拟身份，只能绑定loopback，不得公开暴露。D1需按drizzle内迁移初始化；参阅docs/ARCHITECTURE.md。

## 发布边界

GitHub是源码仓库，不是现成的照片存储或身份服务。本应用含Worker/D1/R2，不能作为GitHub Pages静态站直接部署。现有ChatGPT认证仅在Sites可信入口下有效；普通Cloudflare或其他部署须先实现验证会话的认证适配层，不能信任互联网传入的身份header。

.openai/hosting.json仅保留逻辑绑定，没有私人Site项目ID。接入Sites时创建或选择你授权的项目并在本机配置；不要将原私人Site绑定复制进公共仓库。

本仓库不包含旅行历史、用户照片、令牌、真实数据库或本机状态。原私人Site及数据未迁移。餐厅与地图来源、近似位置和状态核实限制见public/data-notes.md。
