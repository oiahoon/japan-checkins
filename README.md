# Japan Check-ins / 日本足迹

可以 clone 后自行部署的私人旅行日志，中文移动端与日式极简界面。照片 → 确认地点和日期 → 保存 → 地图 / 时间线。重复到访新增记录，不根据照片推断旅行历史、餐厅已吃过或到访深度。

## 当前能力

- 默认密码访问：管理密码可记录旅行，可选访问密码只读；GitHub OAuth 登录可选。
- 私有 / 公开模式可配置；公开页只展示主人明确发布的记录和照片，草稿及旧记录默认私有。
- 私有 GitHub 数据仓库：照片草稿、旅行记录、历史标记通过服务端 GitHub API 保存；仓库变为公开时拒绝访问。
- 照片缩小、客户端和服务端清除元数据；照片通过登录保护的接口读取，凭证不进入浏览器。
- 上传和保存幂等重试、Git 并发冲突有界重试，重复到访新增记录。
- 本机解析 JPEG EXIF 地点 / 日期建议；确认或编辑后才能保存坐标。无 GPS 可手动输入或只记地区。
- 日本 47 都道府县地图、时间线、24 家精选餐厅、任意城市 / 街道 / 地点。

不支持离线保存、全球地图或图片视觉定位；HEIC 取决于浏览器解码，EXIF 建议解析目前只支持 JPEG。

## Clone 与配置

```sh
git clone git@github.com:oiahoon/japan-checkins.git
cd japan-checkins
npm ci
npm run setup
# 按 docs/SELF-HOSTING.md 配置 .env.local
npm run dev
```

Node >=22.18。本地入口为 `http://localhost:3000`，绑定 loopback。setup 生成密码保存在本机 .setup/admin-password.txt；填写自己的私有仓库和受限 token 后使用。不会提供模拟登录或自动接入其他私人资源；缺少存储配置时保存失败并显示错误。

完整 [密码访问、公开模式、私有仓库与 GitHub → Vercel 部署步骤](docs/SELF-HOSTING.md)。无需 D1、R2 或付费地理编码服务。建议公共代码仓库与自己的私有数据仓库分开；数据仓库也可以是你自己的私有项目副本。

```sh
npm run typecheck
npm test
npm run build
npm run start
```

默认运行 Next.js，提供 `vercel.json`；连接 GitHub 后 main 推送自动部署到 Vercel。GitHub Actions 校验源码、合成测试和构建，不处理个人照片或自动部署私人站点。每次保存直接写入数据仓库，无需等待构建。

## 验证与兼容

自动测试覆盖密码哈希、角色权限、公开投影、EXIF 缺失 / 损坏、边界、确认与元数据清除、会话签名 / 过期 / 所有权、并发记录及失败保存重试。真实私有仓库写入和手机照片上传需部署者使用自己的配置验收；不能把本地合成测试当作线上验收。

旧 Sites + D1/R2 适配器保留，可使用 `npm run dev:sites` / `build:sites` / `start:sites`。它只能在可信 Sites 网关下使用，不作为 Vercel 的认证路径。原私人 Site、数据和访问权限没有迁移或修改。迁移不会自动导入旧记录。

公共模板不包含照片、旅行历史、令牌或个人 Site ID。旅行与照片会留在数据仓库的 Git 历史中；移除草稿不会清除历史副本。地图和餐厅来源见 [数据说明](public/data-notes.md)。
