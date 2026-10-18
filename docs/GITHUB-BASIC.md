# GitHub 基础版：Git 管理，网页浏览

**第一次部署、不熟悉终端？先看[新手六步指南](GETTING-STARTED.md)**，它使用 GitHub Desktop 图形按钮，并给出每步完成标志。本页是命令行、配置格式与限制的详细参考，两条路径不必重复操作。

每位用户拥有自己的源码仓库、Pages网址和私有数据仓库，不共用作者的网站。基础版不需要Vercel或Redis：通过Git上传 / 修改数据，Actions生成记录，Pages负责地图、时间线、照片查看与导出。网页上传 / 编辑 / 删除被隐藏，数据适配器也拒绝写入。

<a id="git-preparation"></a>
## 0 · 第一次使用 Git

1. 准备 GitHub 账号，安装 [Git](https://git-scm.com/downloads)；终端执行 `git --version` 确认可用。macOS 首次运行可能提示安装命令行开发工具，按系统提示完成后再继续。
2. 选择一种本机认证方式。已有可用认证就沿用，不必重新登录：
   - **HTTPS**：可安装 [GitHub CLI](https://cli.github.com/)，执行 `gh auth login --hostname github.com --git-protocol https --web`，按浏览器提示登录，再执行 `gh auth setup-git` 和 `gh auth status`。源码和数据仓库都使用 GitHub 页面 Code → HTTPS 的 clone 地址。
   - **SSH**：按 [GitHub SSH 指南](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)准备密钥、添加公钥并测试连接；使用 Code → SSH 的 clone 地址。
3. clone 到本机后，在**每个需要提交的仓库目录**检查身份；缺少或需要单独设置时执行下方 `git config`。这些设置只影响当前仓库，已有合适身份无需覆盖。

```sh
git config --get user.name
git config --get user.email
# 把示例替换成自己的显示名与 GitHub Settings → Emails 中的提交邮箱
git config user.name "你的提交显示名"
git config user.email "你的GitHub提交邮箱"
```

可使用 GitHub 提供的 noreply 邮箱，避免公开个人邮箱。提交身份与登录认证是两件事：设置姓名 / 邮箱不能获得 push 权限。GitHub 不接受账号密码作为 HTTPS Git 密码；手动使用 token / 凭据管理器时见[认证说明](https://docs.github.com/en/get-started/git-basics/about-remote-repositories)。不要把 token 写进 clone URL、命令参数或提交内容。

本机 Git 认证、基础版网页的 **Contents 只读 token**、进阶服务端的 **Contents 读写 token**分别用于不同入口。不要把本机 CLI 凭据直接复制到网页或部署配置；网页只授权一个数据仓库。复制导入工作流需要向数据仓库提交 `.github/workflows/import.yml`，本机凭据还须具备该仓库工作流文件的更新权限（fine-grained token 的 Workflows 写权限，或所用认证方式对应的权限）。这与 Actions 运行时内置的 `GITHUB_TOKEN` 不同。

基础版使用托管 Actions 时，本机不需要 Node.js / npm；只有本地构建网页、运行导入脚本或安装进阶版才需要 Node.js >=22.18，并在**源码目录**执行 `npm ci`。

## 1 · 部署自己的网页

1. Fork本项目（或clone后push到自己的源码仓库），源码可以公开。
2. 在源码副本的Actions中启用工作流。
3. Settings → Pages → Source选择GitHub Actions。
4. Actions → 发布 GitHub 基础版 → Run workflow。
5. 完成后打开 `https://你的用户名.github.io/源码仓库名/`。

GitHub Free的公开源码仓库可使用Pages；私人源码的Pages取决于账号方案。**公开的是应用代码，不是你的照片。** 不要在数据仓库启用Pages。

<a id="data-repository"></a>
## 2 · 准备自己的私有数据仓库

创建 **private** 数据仓库，例如 `my-travel-data`，勾选README。把源码中的 [deploy/github-import.yml](../deploy/github-import.yml) 复制到该数据仓库的 `.github/workflows/import.yml` 并提交。

工作流默认读取同一账号下的 `japan-checkins` 源码副本的main。如果源码改过名字，在**数据仓库** Settings → Secrets and variables → Actions → Variables添加 `TRAVEL_APP_REPOSITORY=你的用户名/源码仓库名`。这不是密钥。源码副本需要能由该工作流读取；建议保持公开，不给数据工作流添加可访问其他私人仓库的广泛令牌。

工作流使用GitHub内置GITHUB_TOKEN，只提交本数据仓库，不需要Vercel或手填写入token。组织策略、分支保护需要允许该工作流提交。它会再次检查仓库private与日志owner；公开仓库不执行导入。自动化不会部署或发布私人数据。

<a id="git-upload"></a>
## 3 · 用Git添加照片

在本机通过 GitHub 的 Code 按钮复制地址并 clone **数据仓库**，进入目录，按第0节确认提交身份，再把照片放进 `inbox/`。例如仓库名为 `my-travel-data`：

```sh
cd my-travel-data
mkdir -p inbox
# 将准备上传的照片复制到 inbox/，可按年份/旅行建立子目录
git add inbox
git commit -m "Add travel photos"
git push
```

Actions → Import private travel photos完成后：

```sh
git pull --ff-only
```

生成：

| 文件 | 用途 |
| --- | --- |
| `travel/photos/*.jpg` | 缩放、正确方向、去EXIF的网页照片 |
| `travel/index.json` | 网站读取的现有日志索引，不建议直接改 |
| `travel/review.json` | 每张照片的EXIF日期 / GPS提议与相机信息，仅供核对 |
| `travel/import.json` | 你编辑的地点、日期、笔记、确认状态与旅行记录 |
| `travel/import-state.json` | 增量状态，不手改；相同输入不会覆盖后来的网页编辑 |

没有GPS / 日期就留空，不使用东京或上传日期兜底。新照片默认未标记；EXIF不会自动成为旅行历史。

**Git上传的是原文件，`inbox/`原图及EXIF会保留在私有仓库与Git历史里。** 派生JPEG去EXIF不等于删除原始历史。不要把数据仓库改公开，也不要把这些文件复制到源码public目录或Pages产物。

每次最多30张新照片，单张原图100MiB、一次扫描原图总量500MiB、最多1000个输入。GitHub自身文件限制仍适用。JPEG / PNG / WebP / AVIF / TIFF按Sharp支持情况转换；HEIC或RAW依赖运行环境解码器，不保证可用，失败时先导出保留EXIF的JPEG。任何无效图片 / 配置会阻止本次生成提交，不跳过出错项并假装全部成功。

## 4 · 在Git中确认地点与记录

编辑生成的 `travel/import.json`。每张照片已有file、绑定原图内容的sourceId和空details。保留生成的sourceId，不手改。核对review.json后，填写，例如：

```json
{
  "details": {
    "country": "JP", "prefecture": "福岡県", "city": "福岡市", "district": "",
    "place": "自己确认的地点", "date": "2020-01-02", "note": "自己的笔记",
    "latitude": null, "longitude": null
  },
  "confirmed": true
}
```

这里只展示需要修改的details和confirmed字段；保留对应photos项中生成的file和sourceId，不要用示例整体替换。`confirmed: true`表示你明确确认该张照片的地点与日期；完整且有效才标记地图。坐标可留null，仅记录地区；填写坐标时必须与地区边界一致。不确定时保留false，仅保存部分信息。

可在同一文件的entries数组中创建旅行记录或文字：

```json
{
  "id": "trip-kyushu-2020", "type": "trip", "title": "九州旅行",
  "date": "2020-01-02", "note": "旅行笔记", "photos": ["inbox/example.jpg"]
}
```

文字记录使用 `type: "text"`，photos为空数组且note非空。记录ID保持不变以便更新；一张照片只属于一个旅行记录。从该entries项的photos数组移除路径可解除关联，不删除照片 / 单张信息。跨记录移动先解除原关联，提交成功后再加入新记录。相册上限100张。

给照片项或旅行记录项加 `removed: true`移入回收状态，`removed: false`恢复。删掉inbox原文件或manifest条目不会自动删除已导入照片。替换原文件内容会创建新的独立待确认照片，清空新照片的旧地点确认，不沿用同一路径的旧确认；同一原图内容重复上传不会重复导入。

```sh
git add travel/import.json
git commit -m "Update travel memories"
git push
```

等待Actions完成后刷新网页并重新连接。自动生成文件需先pull，避免Git冲突；工作流非强推，遇到同时写入会失败，重新运行工作流读取最新分支后重试，不覆盖别人的更新。

也可从源码目录本地运行 `npm run import:git -- --repository-root /绝对路径/my-travel-data --repository 用户名/my-travel-data`。需要GitHub CLI已登录，或当前进程提供受限GH_TOKEN；命令先核验private，再生成工作区文件，不自动commit / push。

## 5 · 私人网页授权

按[逐项授权步骤](GETTING-STARTED.md#token)创建**仅授权这个数据仓库、Contents只读**的fine-grained token。网页填写仓库名和token，连接后可浏览已确认足迹、待整理照片、时间线 / 相册与导出。分支默认main，可在首次连接帮助中调整。

令牌只留在当前页内存，刷新要重新连接，不进URL / Cookie / localStorage / Actions / Pages。访问由GitHub权限验证，不是用前端密码遮住公开照片。只能在信任的源码副本和HTTPS站点输入凭据。

没有Vercel仍能拥有自己的网站，但**不能承诺clone后零配置、无需授权即可查看私仓**。基础版需要启用Pages、复制导入工作流和一次只读授权。想使用网页上传、智能补充、批量管理和密码会话，请选择 [服务端进阶版](SELF-HOSTING.md)；可复用原私有数据，不必重传，owner须保持一致。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| Pages无地址 | 启用fork工作流、Pages Source选Actions，再手动发布 |
| 导入没有运行 | 工作流应在private数据仓库；检查inbox路径、Actions和分支策略 |
| 找不到源码 | 配置TRAVEL_APP_REPOSITORY；默认同账号japan-checkins/main，源码需可读 |
| 导入失败 | 打开失败运行的步骤；JSON语法错误会指出文件名（不输出私人内容），修正后重新提交。也检查图片格式 / 大小 / 每次30张新照片 / owner；必要时导出JPEG |
| 地图没有新足迹 | 新照片只生成提议；编辑import.json并明确confirmed后才上图 |
| 网页不能上传或修改 | 基础版有意只读，用Git更新或部署服务端进阶版 |
| 私仓无法读取 | 核对token有效期、选中仓库、README与分支、组织批准；仅选中仓库或只有Metadata权限不够，必须明确添加Repository permissions → Contents只读 |
| 更改manifest后没覆盖网页内容 | 只有实际修改过的导入项才重新应用；相同配置不覆盖后续网页编辑 |

不支持离线保存，Git历史不会永久清理。真实机型、Safari、分享 / 打印和大图库吞吐需单独验收。

后续更新源码、Pages 和数据仓库里的工作流副本，以及备份 / 回滚方式，见[升级维护指南](UPGRADING.md)。同步源码不会自动替换数据仓库的 `.github/workflows/import.yml`。

官方依据：[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[GitHub REST跨域](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)。
