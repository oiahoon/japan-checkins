# 第一次部署：做一个属于自己的旅行网站

你会得到自己的网址，照片保存在自己的私有 GitHub 仓库。无需申请作者网站的账号，也不会连接作者的数据。

## 先选一种使用方式

| 你希望怎么添加照片？ | 选择 | 需要准备 |
| --- | --- | --- |
| 用电脑把照片提交到 GitHub，网页只负责查看 | **GitHub 基础版**：按下面六步操作 | GitHub 账号、GitHub Desktop、文本编辑器 |
| 在网页上选照片、补信息、管理记录，用密码登录 | **服务端进阶版**：[转到进阶步骤](#advanced) | GitHub 账号、Node.js、Vercel 账号或自有服务器 |

基础版可使用 GitHub Desktop 的图形按钮完成 Git 操作，不必输入 Git 命令；确认地点仍需编辑一个 JSON 文件。进阶版日常使用更方便，但首次安装要配置服务器环境。两者都还不是“点一次就全部完成”。**首次部署先跳过 Redis、在线地点搜索和自定义域名。**

## 先分清两个仓库

“仓库”就是 GitHub 上保存文件的项目空间。本指南建议使用以下名字，先不要改名或换分支：

| 仓库 | 怎么得到 | 放什么 | 可见性 |
| --- | --- | --- | --- |
| `你的账号/japan-checkins`：源码仓库 | Fork 本项目，复制一份应用到自己的账号 | 网站程序、地图资料、部署说明 | 建议 Public（公开），便于基础版 Pages 和导入工作流使用 |
| `你的账号/my-travel-data`：数据仓库 | 自己新建 | 原照片、处理后的照片、地点、日期、笔记 | **Private（私有）**，勾选 README |

Fork = 在 GitHub 复制项目；Clone = 下载仓库到电脑；Commit = 在电脑记下一次修改；Push = 把修改上传到 GitHub；Pull = 把 GitHub 上的新修改取回电脑。**电脑里复制了照片、或只点 Commit，都还没有上传。**

## 基础版六步

### 1 · 复制应用，发布自己的空网站

1. 在[本项目 Fork 页面](https://github.com/oiahoon/japan-checkins/fork)创建自己的源码副本。Owner 选自己，仓库名保持 `japan-checkins`，默认分支保持 `main`。
2. 进入**自己的源码仓库**，点 Actions；若提示禁用工作流，按页面提示启用。
3. 进入 Settings → Pages，将 Source 设为 GitHub Actions。本项目已有工作流，不必再添加 GitHub 建议的其他模板。
4. 回到 Actions，选择 **发布 GitHub 基础版**，点 Run workflow，分支选 `main` 并运行。
5. 等待这次任务完成；打开任务中的部署链接，或 Settings → Pages 给出的站点地址，通常是 `https://你的账号.github.io/japan-checkins/`。

**完成标志：**看到“私有数据仓库”“连接令牌”的连接页。此时没有照片是正常的。若任务标红，先看失败的那一步，不要反复创建仓库。

### 2 · 新建私人照片空间

在[新建仓库页面](https://github.com/new)创建 `my-travel-data`：可见性选 **Private**，勾选 Add a README，分支保持 `main`。**不要在这个仓库启用 Pages。**

安装 [GitHub Desktop](https://desktop.github.com/)，用同一 GitHub 账号登录；按客户端提示设置提交姓名与邮箱，可使用 GitHub Settings → Emails 给出的 noreply 邮箱。在 File → Clone Repository 中选自己的 `my-travel-data`，选择电脑保存目录并 Clone。找不到仓库时，核对登录账号和仓库名。

**完成标志：**GitHub 网页显示仓库为 Private，电脑上也有一份 `my-travel-data` 文件夹。普通基础版用户无需安装 Node.js 或执行 `npm ci`。

### 3 · 给数据仓库安装自动整理流程

1. 打开**源码仓库**的 [`deploy/github-import.yml`](../deploy/github-import.yml)，点 Raw 查看原始内容，复制全部文字；不要复制整个 GitHub 网页。
2. 在 GitHub 网页打开**数据仓库**，点 Add file → Create new file。文件名填写 `.github/workflows/import.yml`，把刚才的工作流内容粘贴进去，确认后 Commit changes 到 `main`。网页会按路径创建文件夹，不用在电脑手动创建隐藏文件夹。
3. 在数据仓库 Actions 中确认能看到 **Import private travel photos**；若提示禁用则启用。它与源码仓库的“发布 GitHub 基础版”是两个不同任务。首次任务完成后，回 GitHub Desktop，Fetch origin → Pull origin，将文件取回电脑。

**完成标志：**数据仓库能看到 `.github/workflows/import.yml` 和对应任务。若仓库策略不允许创建或运行工作流，需要仓库管理员处理，不能通过公开数据仓库解决。

本流程默认从同账号的 `japan-checkins/main` 读取程序。如果同名仓库已经存在，或你给源码改了名字：先在**数据仓库** Settings → Secrets and variables → Actions → Variables，新建仓库变量 `TRAVEL_APP_REPOSITORY`，值为 `你的账号/实际源码仓库名`，再安装 / 运行导入工作流。例如源码叫 `my-travel-site`，这里就填 `你的账号/my-travel-site`，不能填数据仓库名或网站网址。此变量不是令牌。组织 / 跨账号情况见[详细设置](GITHUB-BASIC.md#data-repository)。

<a id="token"></a>
### 4 · 让自己的网页读取私仓

令牌（token）是专门给程序的访问凭据，不是 GitHub 登录密码。打开 [fine-grained token 创建页面](https://github.com/settings/personal-access-tokens/new)，按下表选择：

| 设置 | 基础版网页怎么选 |
| --- | --- |
| Token name / Expiration | 填易辨认的名字和合适的有效期；过期后需换新令牌 |
| Resource owner | 自己数据仓库所属的账号 |
| Repository access | Only select repositories，只选 `my-travel-data` |
| Permissions → Repository permissions → Contents | **Read-only（只读）**；自动附带的 Metadata 保留默认 |

**选中仓库不等于允许读取文件。** 需要明确添加上面的 Contents 权限，只有 Metadata 权限会出现“能找到仓库，但读不到照片记录”。其他权限不额外开启，确认后生成令牌。将它安全保存到自己的密码管理器；不要提交到仓库、发到聊天或填到作者的网站。组织账号可能需要管理员批准。

打开**第1步得到的自己的网址**，填写：

- 私有数据仓库：`你的账号/my-travel-data`，不是完整网址，也不是源码仓库名。
- 连接令牌：刚生成的只读令牌，不是 GitHub 密码。

点“连接私人日志”。**完成标志：**打开地图；空数据仓库会显示空日志。刷新后需要重新输入令牌，这是当前基础版的使用方式。

这个令牌仅供网页读取；GitHub Desktop 用自己的登录管理提交；Actions 用 GitHub 自动提供的运行凭据。无需把网页令牌配置到 Actions，也不要把 Desktop 的登录凭据复制到网页。

### 5 · 先用一张照片跑通导入

1. 在 GitHub Desktop 选 `my-travel-data`，点 Fetch origin；如出现 Pull origin，先点它取回最新文件。
2. 在电脑的数据仓库创建 `inbox/`，复制一张 JPEG 原照片进去。先试一张，不要首次就放整个相册。
3. 在 Desktop 审阅 Changes，确认照片只进入**数据仓库**，填写 Summary，Commit to main → Push origin。
4. 在数据仓库 Actions 等待 **Import private travel photos** 成功。完成后回 Desktop，Fetch origin → Pull origin，取回自动生成文件。
5. 刷新自己的网页并重新连接，在“照片”中检查新照片。

**完成标志：**`travel/photos/` 与 `travel/import.json` 已生成，网页照片库能看到照片。**照片出现不等于地图已经新增足迹**：EXIF 中的日期 / GPS 还需要你确认。第一次建议用 JPEG；HEIC / RAW 失败时见[格式与大小限制](GITHUB-BASIC.md#git-upload)。

`inbox/` 中的原文件及其位置元数据会留在私仓和 Git 历史。不要把数据仓库改公开，也不要把照片拷贝到源码仓库的 `public/`。

### 6 · 确认信息，生成第一处足迹

用文本编辑器打开电脑数据仓库的 `travel/import.json`，在 `photos` 数组找到刚才文件的 `file` 项。只修改该项的 `details` 和 `confirmed`，**保留生成的 `file`、`sourceId`、外层大括号和其他照片项**。

下面是需要填写的内容片段，**不是用来替换整个文件**。所有地点与日期都是示例，请替换成这张照片的实际信息：

```json
"details": {
  "country": "CN",
  "prefecture": "四川省",
  "city": "成都市",
  "place": "自己确认的地点",
  "date": "2020-01-02",
  "note": "自己的旅行笔记",
  "latitude": null,
  "longitude": null
},
"confirmed": true
```

`country` 中国填 `CN`，日本填 `JP`；`prefecture` 中国填省级名称，日本使用地图里的都道府县名称，例如 `福岡県`。日期使用 `年-月-日`，例如 `2020-01-02`。坐标可以保留 `null`，首次使用不必填写。

可从 `travel/review.json` 核对照片读出的日期与 GPS 建议；缺少信息就手动补，不用上传日期代替拍摄日期。不确定时 `confirmed` 保持 `false`，照片仍会保留。使用英文双引号和逗号；JSON 不能加注释。

保存文件后，在 Desktop Commit to main → Push origin；等待数据仓库导入成功，再 Fetch / Pull。刷新网页重新连接，查看地图和时间线。

先在“时间线”找到刚确认的记录，点“查看地图”，地图会跳转到对应地区。首次地图可能从日本开始，记录在中国时不要只在日本地图上找；也可通过地图搜索地区。常用地区可在地图选项里设置。

**完成标志：**照片卡片显示“已标记地图”，地点 / 日期 / 笔记正确；时间线有对应记忆，“查看地图”能定位到该地区。刷新后重新连接，信息仍在。到这里才算完成“部署 → 添加照片 → 确认地点 → 查看足迹”的完整流程。

以后每次添加照片重复第5–6步。创建旅行相册、批量关联、删除 / 恢复和命令行操作见[基础版详细指南](GITHUB-BASIC.md)；更新应用与备份见[维护指南](UPGRADING.md)。

<a id="advanced"></a>
## 进阶版：在网页添加照片

如果希望日常只使用网页，就选择这一版。**不必先完成基础版六步。** 仍需自己的源码副本和 private 数据仓库；已有基础版可复用同一数据仓库，不用重新上传照片，保留已有 owner。

1. Fork 源码、新建 private 数据仓库，安装 Node.js >=22.18 和 Git；按[进阶指南](SELF-HOSTING.md)克隆源码副本，在源码目录执行 `npm ci`。
2. 单独创建只授权数据仓库、**Contents = Read and write** 的服务端令牌。创建方法参考[上方令牌步骤](#token)，但权限改为读写；只交给本机初始化及自己的服务端，不填入基础版网页。
3. 在源码目录执行 `npm run setup`，选择 Vercel 或自有服务器，按引导填写仓库名与令牌。引导生成环境配置和管理密码；隐藏目录 `.setup/` 可用文本编辑器的“打开文件”功能访问。管理密码在 `.setup/admin-password.txt`，不是令牌，也不是 `ADMIN_PASSWORD_HASH`。
4. 按[部署步骤](SELF-HOSTING.md)导入所选目标的配置，完成 HTTPS 与登录限流。Vercel 模式须真正配置登录 WAF 后声明并重新部署；**仅看到部署 Ready，还不代表密码登录可用**。首次部署不需要 Redis。
5. 用管理密码进入自己的站点；打开“主人空间”中的 `/setup` 检查。通过后上传一张照片，补充地点 / 日期并保存，再刷新、重新打开照片确认信息仍在；查看地图和时间线。

**完成标志：**自己的正式网址能登录；照片保存并刷新后仍存在；已确认地点出现在地图上。具体配置、503 / 403排查和服务器命令见[进阶指南](SELF-HOSTING.md)。这一路不要求安装数据仓库的照片导入工作流，网页保存直接由服务端写入。

## 卡住时，先定位到这一步

| 你看到的情况 | 先检查 |
| --- | --- |
| 网站404、打不开 | 看**源码仓库**的Pages发布是否成功，打开平台给出的地址 |
| 数据仓库没有自动生成文件 | 看**数据仓库**的导入任务，不要看源码仓库的发布任务 |
| 照片在电脑，网站没有 | 是否点了Push、导入任务是否成功；完成后刷新网页重新连接 |
| 照片在网页，地图没有 | 地点 / 日期是否完整、是否明确confirmed并再次提交成功 |
| 能找到仓库，但提示不能读取照片记录 / 403 | 明确添加该仓库的Contents只读权限；组织仓库检查批准状态，另核对GitHub请求额度。保存后若平台要求重新生成令牌，用新令牌重新连接 |
| 网页找不到私仓 | 令牌是否过期、选错仓库、权限未批准；数据仓库是否有README和main分支 |
| 修改JSON后任务失败 | 打开失败任务的运行步骤。若提示 `travel/import.json 不是有效 JSON`，修正该文件的英文引号、逗号和括号后重新Commit / Push；失败不会提交本次生成结果，已有照片和足迹仍保留。不要删除index或重建私仓来修复 |
| 找不到网页上传按钮 | 当前是基础版；上传 / 编辑入口属于服务端进阶版 |
| 进阶版503或403 | 分别检查登录限流、可信网址APP_URL，按进阶FAQ排查 |

提供帮助信息时只发失败步骤和已遮去私人信息的错误消息，不要发 token、密码、完整环境文件或含真实GPS的日志。GitHub Actions、Pages、Vercel的可用性与额度由各自账号方案决定，不能承诺无限免费使用。

官方操作参考：[网页创建文件](https://docs.github.com/en/repositories/working-with-files/managing-files/creating-new-files)、[GitHub Desktop 克隆](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop)、[提交和推送](https://docs.github.com/en/desktop/making-changes-in-a-branch/pushing-changes-to-github-from-github-desktop)、[fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)、[Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 照片多了以后再考虑加速

首次部署不需要图床。进阶版可选 [ImageKit 私有图片加速](IMAGEKIT.md)，Git 继续保存照片，失败自动回退，随时可关闭；基础版无需增加配置。建议先完成一张照片的完整流程，再决定是否启用。
