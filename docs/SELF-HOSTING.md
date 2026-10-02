# 自部署：私有 / 公开日志与密码访问

## 默认方案

GitHub 保存源码和私有旅行数据，Vercel 运行 Next.js 服务端并随 GitHub `main` 推送自动部署。默认私有、密码登录；GitHub OAuth 可选，不再是必要步骤。

| 访问方式 | 可见内容 | 管理权限 |
| --- | --- | --- |
| 私有 + 管理密码 | 所有记录、历史标记和照片草稿 | 上传、保存、发布 / 撤回公开展示 |
| 私有 + 访问密码 | 所有已保存记录，照片草稿不可见 | 只读 |
| 公开访客 | 主人明确发布的记录及其照片 | 只读，无需密码 |

**数据仓库始终保持私有。** `JOURNAL_VISIBILITY=public` 只是允许网页提供公开投影。旧记录和新记录默认不公开，主人需在时间线点击“允许公开展示这条记录”并确认：照片、日期、地点、坐标和笔记将一起公开。撤回后公开接口停止提供该记录和照片；已被他人下载的内容无法收回。

照片 JPEG EXIF 在浏览器内读取并提出建议，用户确认后才保存坐标；服务端再次移除照片元数据。原图不会上传到仓库或 Actions。照片不能用于推断旅行历史、到访深度或餐厅已吃过状态。

## 1. 准备私有数据仓库

创建自己账户中的 **private** 仓库，初始化 README，确保 `main` 分支已存在。推荐与公共源码分开，避免保存照片触发源码构建。服务端第一次写入时创建 `travel/index.json` 和 `travel/photos/<upload-id>.jpg`。

创建 fine-grained personal access token：只选择这个数据仓库，授权 **Contents: Read and write**。不要使用可以访问其他私人仓库的广泛权限令牌。仓库分支须允许令牌直接更新；若分支保护要求 PR，可以建立专用数据分支并配置 `GITHUB_DATA_BRANCH`。

索引上限 512 KiB，每张处理后 JPEG 最多 3 MB，每条记录最多 6 张照片，最多 30 张未保存草稿。这是个人小规模日志。不要启用数据仓库的 Pages，也不要把照片复制到源码 `public/`。

## 2. 一键准备本地配置

```sh
npm ci
npm run setup
```

`setup` 保留已有环境变量，生成随机管理密码、加盐 scrypt 哈希和会话密钥。明文管理密码只写入本机 `.setup/admin-password.txt`，权限为 600；配置写入 `.env.local`。这两个位置都被 Git 和 Vercel 上传规则忽略。不要提交或分享整个配置文件。

编辑 `.env.local` 的 `GITHUB_DATA_REPOSITORY` 和 `GITHUB_DATA_TOKEN`，运行 `npm run dev`，访问 `http://localhost:3000`。

如需自选密码或独立只读访问密码：

```sh
npm run password:hash
```

从标准输入输入至少 12 个字符的密码后结束输入，复制输出的 scrypt 哈希到对应变量。不要把明文密码写进命令参数或 shell 历史。生成器也可通过本机工具的安全输入管道使用。管理与访问密码应不同；拥有访问密码的人能看全部已保存私人记录，不能上传和修改。

## 3. 环境变量

| 变量 | 用途 |
| --- | --- |
| `AUTH_PROVIDER` | 默认 `password`；可选 `github`；Sites 仅用于原可信入口 |
| `JOURNAL_VISIBILITY` | 默认 `private`，可改为 `public` |
| `APP_URL` | 本地 `http://localhost:3000`；正式站点唯一 HTTPS origin，不含路径 |
| `SESSION_SECRET` | 随机会话密钥，至少 32 个字符 |
| `JOURNAL_OWNER_ID` | 持久 owner，默认 `journal-owner`；首次保存后不要改变 |
| `ADMIN_PASSWORD_HASH` | 管理密码的加盐 scrypt 哈希 |
| `VIEWER_PASSWORD_HASH` | 可选只读密码哈希；留空则无访问密码 |
| `PASSWORD_RATE_LIMIT` | 正式 Vercel 完成 WAF 配置后填 `vercel-waf` |
| `GITHUB_DATA_REPOSITORY` | 自己的 `owner/private-repository` |
| `GITHUB_DATA_BRANCH` | 已存在简单分支名，默认 `main` |
| `GITHUB_DATA_TOKEN` | 只访问数据仓库的受限令牌 |

所有配置均为服务端变量，不使用 `NEXT_PUBLIC_`。更换任一密码哈希或会话密钥会使旧密码会话失效；会话最长 24 小时。退出清除当前浏览器 Cookie。

## 4. GitHub → Vercel 自动部署

1. 将 clone 后的源码推送到自己的 GitHub 仓库。
2. Vercel 导入该源码仓库，选择 Next.js。`vercel.json` 指定 `npm ci` 和 `npm run build`。
3. 在项目环境变量中配置上表；`APP_URL` 使用 Vercel 项目的默认生产域名。不要给不可信 PR 预览环境配置私人数据令牌。
4. 配置项目 **Firewall** 规则：path equals `/api/auth/password`，Rate Limit，每 IP 60 秒最多 5 次，超限返回 429；发布规则后，设置 `PASSWORD_RATE_LIMIT=vercel-waf`。该标志只是部署者对已配置 WAF 的声明，代码无法自动检查平台规则。生产密码登录缺少声明时返回 503，避免把实例内存限流误当作全局保护。
5. 推送到 `main`，Vercel 自动构建与部署。GitHub Actions 独立运行 typecheck、合成测试、build，不处理私人照片、不注入私人数据令牌。
6. 每次保存由服务端直接提交私有数据仓库，无需等待构建。生产版本不会信任 ChatGPT 身份 header。

其他服务端部署需要提供等价的分布式登录限流适配器；目前生产密码模式只支持上述 Vercel WAF 配置。不要把服务端密码保护改为前端遮罩后部署到 GitHub Pages。

### 自定义域名

在 Vercel 项目 Domains 添加域名，按提示配置 DNS，等待 HTTPS 证书完成；再把 `APP_URL` 更新为该域名 origin 并重新部署。使用新域名重新登录。数据仓库与 owner 不变，不迁移旅行数据。密码模式无需调整 OAuth App 回调。

## 可选 GitHub OAuth

设置 `AUTH_PROVIDER=github`，建立自己的 GitHub OAuth App，homepage 为站点 origin，callback 为 `APP_URL/api/auth/callback`。配置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 和数字 `GITHUB_ALLOWED_USER_ID`，并在首次保存前让 `JOURNAL_OWNER_ID` 与该 ID 一致。已有日志改变 owner 需要迁移设计，不能直接修改环境变量。

OAuth 只核实登录身份，不请求全部私人仓库的 `repo` scope。数据访问仍使用受限令牌。本地与生产建议使用不同 OAuth App；自定义域名时同步更新回调。

## 验收与限制

- 私有模式未登录不能读取记录、原始接口照片或上传；伪造 identity header 不授予权限。
- 管理密码可以上传 / 保存 / 发布，访问密码只能查看且看不到草稿；直接请求修改接口返回 403。
- 公开模式只展示显式发布记录。未发布记录、照片草稿和私人独立历史标记均不可被公开接口读取；撤回后照片返回 404。
- 无 GPS、损坏 GPS、坐标边界、确认、照片元数据清除、所有权、并发、重复到访和响应丢失后重试须通过测试。
- 缺少 token、仓库公开或分支不存在时，保存显示错误并保留页面内容；未配置不能被宣传为已经可保存。
- 真正的私人仓库写入和手机照片验收需要部署者自己的受限 token 与设备，不等同于合成测试。

删除草稿只删除当前文件和引用，不清除 Git 历史。当前没有已保存记录删除、批量导出、历史清理、多人管理、全球地图、离线保存、HEIC EXIF 或多地点自动拆分。旧私人 Sites / D1 / R2 数据没有自动迁移。

## 官方依据

- [密码哈希](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Vercel 登录限流](https://vercel.com/kb/guide/limit-abuse-with-rate-limiting)
- [GitHub OAuth 与 PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Git 分支非强制更新](https://docs.github.com/en/rest/git/refs)
