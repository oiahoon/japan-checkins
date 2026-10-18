# 进阶版：服务端私人旅行日志

只使用 GitHub、通过 Git 上传照片并在网页浏览，请先看 [GitHub 基础版](GITHUB-BASIC.md)。本页适用于需要密码访问、只读访客或服务端管理令牌的用户。

本指南以当前实现为准。**Vercel 是托管选项，不是必需依赖。** 应用使用标准 Next.js 服务端；照片与旅行记录保存在自己的私有 GitHub 仓库。每个部署一位主人，可另设只读访问密码。

## 1 · 准备自己的仓库

未配置本机 Git 时，先完成[安装、认证与提交身份准备](GITHUB-BASIC.md#git-preparation)。

1. Fork 源码，clone 自己的副本；Node.js >=22.18，执行 `npm ci`。
2. 创建自己的 **private 数据仓库**，勾选“Add a README”，确保 `main` 分支存在。源码与数据分开，上传照片不会触发源码部署。
3. 创建 fine-grained GitHub token：只选择这个数据仓库，Contents 为 Read and write。组织仓库可能还需批准。不要使用可访问所有私人仓库的广泛令牌作为部署凭据。

数据仓库不能开 Pages，不能把照片放入源码 `public/`，不能改成 public。服务端会拒绝公开数据仓库。

## 2 · 一次初始化

```sh
npm run setup
```

在交互终端中选择 Vercel / 自有服务器 / 本机，填写数据仓库与令牌；令牌输入隐藏。管理密码、scrypt 哈希和会话密钥自动生成，重复运行保留现有密码和配置。

生成文件：

| 文件 | 用途 |
| --- | --- |
| `.setup/admin-password.txt` | 本机查看新生成的管理密码；权限600，不输出到终端 |
| `.env.local` | 本地开发配置；保留已有的其他配置 |
| `.setup/vercel.env` | Vercel 环境变量批量导入文件 |
| `.setup/server.env` | 自有服务器运行环境 |
| `.setup/local.env` | 选择本机时生成的配置快照 |

只生成所选目标的环境文件。这些文件都包含私人配置，不要上传到源码、聊天或公共位置。`.setup`、`.env.local` 被 Git / Vercel 上传规则忽略。

自动化 / 无交互终端可用 `npm run setup -- --target local`；`--target server --url https://travel.example.com`；`--target vercel`。非秘密参数可使用 `--repository owner/private-repository`；令牌可由安全输入管道传到 `--token-stdin`，不要放在命令参数中。更换自选密码使用 `npm run password:hash` 从标准输入生成哈希；已有数据不要改变 owner。

## 3A · Vercel（免维护应用服务器）

1. Vercel 导入自己的源码仓库，框架 Next.js，沿用仓库 `vercel.json`。
2. 将 `.setup/vercel.env` 通过环境变量导入功能一次导入 **Production**。不向不可信 PR / Preview 提供私人数据令牌。
3. 在 Firewall 配置 `/api/auth/password` 的 Rate Limit：每IP每60秒最多5次，超限429。规则实际发布后，设置 `PASSWORD_RATE_LIMIT=vercel-waf`，重新部署。初始化不会替你自动确认 WAF 已配置；也可在完成规则后用 `setup --target vercel --waf-configured` 生成包含该声明的导入文件。
4. 用 `.setup/admin-password.txt` 中的密码登录，打开 `/setup` 检查，再点“添加第一张照片”。以后源码 main 推送由 Vercel 自动部署。

默认生产地址可从服务端 `VERCEL_PROJECT_PRODUCTION_URL` 读取；平台须启用系统环境变量。**不会使用客户端 Host / Forwarded 头来推断可信地址。** 若配置 `APP_URL`，它始终优先。自定义域名时将 `APP_URL` 改为唯一正式 HTTPS origin 并重新部署，从新域名登录。

`PASSWORD_RATE_LIMIT=vercel-waf` 仅为部署者的声明，应用无法自动审计平台规则。缺少声明则生产密码登录503，不把实例内存当作分布式保护。不要在 Vercel / 其他临时文件系统的 serverless 实例选择 file 模式。

## 3B · 自己的 Node.js 服务器（不需要 Vercel）

初始化选择“自有服务器”并提供正式 HTTPS 地址，得到 `.setup/server.env`。把源码、依赖与该环境文件放到自己的服务器；环境文件仅给服务账号读取。

```sh
npm ci
npm run build
NODE_ENV=production node --env-file=.setup/server.env scripts/doctor.mjs --remote
NODE_ENV=production node --env-file=.setup/server.env node_modules/next/dist/bin/next start --hostname 127.0.0.1
```

在 HTTPS 反向代理后运行，代理到本机 `127.0.0.1:3000`；不要直接把 Node 端口开放到公网。代理上传上限至少4MiB、请求超时至少65秒。用自己的证书 / HTTPS 入口，`APP_URL` 与浏览器的正式地址完全一致。使用 systemd / 进程管理器在开机时加载同一个环境文件。

此方式默认 `PASSWORD_RATE_LIMIT=file`：全站每个固定一分钟窗口最多5次密码尝试，不信任客户端提供的 IP。独占创建文件槽位，单机多进程共享同一个目录，重启不会清零；文件不可写时登录失败关闭。默认 `.local/login-rate-limit` 必须持久可写，也可设置 `PASSWORD_RATE_LIMIT_DIR` 指向自己的持久卷。该目录只存尝试槽位，不存密码或照片；不是旅行数据库。

仅支持单台主机 / 共享可靠本地文件系统。多主机、只读容器、临时盘和其他 serverless 不属于 file 模式支持范围；需要另行配置分布式保护。也可按KV指南选用Redis分布式限流；仍不提供Docker镜像 / 任意云平台一键适配验收。

## 3C · 本机体验

```sh
npm run doctor -- --remote
npm run dev
```

打开 `http://localhost:3000`。生产仍强制 HTTPS；不提供关闭同源检查或模拟登录的开关。

## 4 · 登录后检查，再添加照片

`/setup` 仅主人可访问：检查站点地址、认证、登录限流声明、仓库配置、私有性、分支及已有日志所有权。默认检查只读，不会上传、创建或修改旅行数据；能连接不等于令牌一定有写权限，第一次照片保存会验证实际写入。主人空间可以随时返回检查。

命令行等价检查：

```sh
npm run doctor -- --remote
# 指定目标配置并按生产规则检查：
NODE_ENV=production node --env-file=.setup/server.env scripts/doctor.mjs --remote
```

成功后点击“添加第一张照片”进入照片库；上传立即成为独立照片记录。EXIF 日期 / GPS 只提供建议，用户补齐并明确保存后成为地图足迹；缺少日期或地点可先保存为待整理照片。单张 / 批量创建或加入旅行相册，关联相册不等于确认到访。第一次写入自动创建 `travel/index.json` 与 `travel/photos/<id>.jpg`。

原始JPEG / HEIC / TIFF / 可解析RAW在浏览器读取和转换，只上传处理后的JPEG；服务端再次清理元数据，索引独立私有保留允许的相机信息和位置 / 日期建议。不是把照片直接推送到 Git 后由 Actions 自动识别，也不需要等应用重新部署。

## 访问与必要配置

默认私有：主人可上传、编辑、管理；独立只读密码只能看已保存记录，不看未确认草稿。公开模式 `JOURNAL_VISIBILITY=public` 只展示主人明确发布的到访及关联照片，新相册 / 文字暂不公开。撤回不会收回别人已经下载的文件。

| 变量 | 必需 / 默认 |
| --- | --- |
| `SESSION_SECRET`、`ADMIN_PASSWORD_HASH` | 初始化自动生成；更改会使旧密码会话失效 |
| `GITHUB_DATA_REPOSITORY`、`GITHUB_DATA_TOKEN` | 自己的 private 数据仓库及受限token |
| `APP_URL` | 自有服务器必需；Vercel可自动识别生产域名；自定义域名须显式设置 |
| `PASSWORD_RATE_LIMIT` | Vercel为已配置WAF后的 `vercel-waf`；单机为 `file` |
| `JOURNAL_OWNER_ID` | 默认 `journal-owner`；首次保存后保持不变 |
| `GITHUB_DATA_BRANCH` | 默认 `main`，须已存在且允许令牌直接更新 |
| `VIEWER_PASSWORD_HASH` | 可选且与管理密码不同 |
| `JOURNAL_VISIBILITY` | 默认 `private` |
| `AUTH_PROVIDER` | 默认 `password`；可选 `github`；旧 `sites` 只适用于可信入口 |
| `JOURNAL_KV`、`JOURNAL_KV_NAMESPACE` | 可选Redis协调开关和每项目/环境独立命名空间；默认off |
| `KV_REST_API_URL`、`KV_REST_API_TOKEN` | 可选原生注入的Secret；也支持UPSTASH_REDIS_REST命名，不混用凭据对 |
| `PASSWORD_RATE_LIMIT_DIR` | file模式持久目录，可选 |
| `GEOAPIFY_API_KEY` | 可选在线地点搜索；默认本地行政区 / 别名建议 |

这些变量都仅在服务端使用，不能以 `NEXT_PUBLIC_` 暴露凭据。会话最长24小时。

### 可选 GitHub 登录

设置 `AUTH_PROVIDER=github` 并建立自己的 OAuth App；callback 为 `APP_URL/api/auth/callback`。配置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、数字 `GITHUB_ALLOWED_USER_ID`，首次保存前令 `JOURNAL_OWNER_ID` 与该ID一致。数据仍使用单独的受限token；OAuth登录不请求所有私人仓库的repo权限。更换域名同步修改回调；已有日志owner变更需专门迁移。

### 可选在线地点搜索

`GEOAPIFY_API_KEY` 留空也能上传与保存：使用本地行政区 / 已维护别名和手动输入，不是完整全球POI库。在线功能需自己在 [Geoapify](https://myprojects.geoapify.com/) 创建key；配置后重新部署。只有主人主动键入的关键词发给供应商，不自动发送旧照片、EXIF、精确GPS或笔记。服务端4秒超时、失败保留本地建议；供应商访问 / 配额须另行验收。选中建议仍需明确保存确认，OSM / Geoapify来源署名保留。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 登录按钮不可用 / 登录503 | 检查配置、密码是否为scrypt哈希、生产限流模式；运行doctor |
| 提交密码 / 保存403 | APP_URL与当前origin不一致，修改后重新部署，不关闭同源校验 |
| 登录429 | 该窗口尝试过多，稍后再试；file模式为全站5次，不是每IP5次 |
| 仓库404 | 检查令牌选中的仓库、组织批准、分支名；空仓库先创建README |
| 检查能读，但上传保存失败 | token还需要Contents写权限；分支保护须允许直接提交或使用已有专用分支 |
| 日志所有权不匹配 | 核对配置，不直接修改原owner或改写旧日志 |
| 照片没定位 / 没日期 | 原图可能无EXIF、格式不支持或已经被移除；手填或从原图补读，不用上传时间兜底 |
| GitHub Pages能否部署 | 可部署[GitHub基础版](GITHUB-BASIC.md)，通过只读token查看私仓，使用Git / Actions添加照片；本页的服务端进阶版（密码会话、网页写入和服务端管理令牌）需要Vercel或自有Node.js服务器，不能由Pages运行 |

## 升级与维护

已部署用户见[升级、备份与回滚指南](UPGRADING.md)。其中分别说明同步 fork、自有服务器更新 / 重启、保留配置、备份私有数据，以及维护数据仓库中的导入工作流副本。普通源码升级不需要重新初始化密码、修改owner或运行旧Sites数据库迁移。

## 当前限制与验收

索引上限512KiB、处理后JPEG每张3MiB、旧到访记录最多6张照片、旅行相册100张、未确认且未归属相册照片最多30张、单次批量100项。支持回收与恢复；清理界面不会永久擦除Git历史。已实现世界地图、多格式元数据、逐张照片记录与批量相册管理；不支持同站多人注册、自动旅程合并、离线保存、RAW显影或旧Sites私人数据自动迁移。

无GPS、损坏GPS、日期与边界、用户确认、元数据清理、权限、并发与幂等重试由合成测试覆盖。新的首次安装 / 真实私仓上传保存验收与生产发布证据见 [PROGRESS](PROGRESS.md)；真实手机 / 相机 / 分享打印仍是独立设备验收，不能用服务端测试替代。

## 官方参考

- [Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting)
- [Vercel 自动生产域名](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Vercel WAF 登录限流](https://vercel.com/kb/guide/limit-abuse-with-rate-limiting)
- [GitHub fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)


## 可选 Redis

进阶版可选启用短期写入协调及全局登录限流，基础版不依赖。默认关闭，不改GitHub主存储。创建、权限、免费费用边界、配置检查与回滚见 [KV.md](KV.md)。本次已获批共享既有Free库并原生连接目标Production；发布及运行时验证结果见PROGRESS，不能把连接成功当作运行时验收。

启用步骤：在Vercel Storage选择自己的Free实例，原生Connect仅选可信Production，保持敏感凭据保护；不要增加付款方式或升级。设置 `JOURNAL_KV=redis` 和独立 `JOURNAL_KV_NAMESPACE`，重新部署。保持原 `PASSWORD_RATE_LIMIT`，只有单独明确选择redis才切换登录限流。主人 `/setup` 默认只读PING；主动运行“验证 Redis 写入锁”会创建随机、最长60秒TTL的隔离测试键，验证SET/EVAL/互斥/过期，不写照片或记录。详情及共享库权限/额度边界见KV文档。
