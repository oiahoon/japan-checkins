# 升级、备份与回滚

本次照片加载升级包含可选 `thumbnailSha` 与私仓 `travel/thumbnails/`，备份时一并保留。新照片自动生成；现有照片无需重新上传。进阶版可按需响应小图，基础版可主动运行 `npm run thumbnails:git` 或更新私仓工作流后勾选 `thumbnails_only`，每次最多 30 张。不会在公开构建中处理私人照片，也不会自动改写你的数据仓库。步骤和兼容边界见 [照片加载与补生成](PHOTO-LOADING.md)。

适用于当前 GitHub 基础版与 Next.js 服务端进阶版。源码仓库保存应用，**独立的 private 数据仓库**保存 `inbox/`、`travel/` 和导入工作流；本机 / 托管平台保存部署配置。三者需要分别维护。下列命令供部署者在自己的副本执行，不会由应用自动运行；示例中的账号、路径、提交和服务名都要替换为自己的值。

## 1 · 更新前记录与备份

先记录当前正常工作的**源码提交**、实际部署版本、数据仓库 / 分支及其提交。它们不是同一个 SHA。在源码目录执行：

```sh
git status --short
git rev-parse HEAD
git remote -v
```

有未提交修改时先整理为自己的提交或另存备份；不要用 `reset --hard`、`clean`、强推来绕过差异。不要把 `.env.local`、`.setup/`、私人数据或令牌加进源码提交。

| 备份对象 | 需要保留的内容 |
| --- | --- |
| 源码 | 已发布提交 SHA、自己的定制提交；可另存源码仓库镜像 |
| 私有数据 | 整个数据仓库的 Git 历史和分支，包含 `inbox/` 原图、`travel/index.json`、`travel/photos/`、`import.json`、`review.json`、`import-state.json` 与 `.github/workflows/import.yml`；不要只备份索引 |
| 部署配置 | 存在的 `.env.local`、`.setup/`（含密码和目标环境文件）；Vercel 实际 Production 配置、域名、WAF与Git连接设置；自有服务器的服务配置、工作目录、HTTPS代理配置及持久限流目录位置 |

配置副本应保存在源码目录以外的私人加密存储 / 密码管理器中，限制访问权限。平台配置可能已不同于最初的 `.setup/vercel.env`，须以实际部署为准核对；不要把令牌、密码或环境变量导出内容发到公共日志。令牌可能到期或撤销，备份文件不代表凭据永远有效。

数据仓库可以在升级前做一次独立镜像备份。以下只从远端读取，使用已配置的本机 Git 认证，URL 不含 token：

```sh
umask 077
travel_backup_dir="$HOME/travel-backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$travel_backup_dir"
git clone --mirror https://github.com/YOUR_ACCOUNT/my-travel-data.git "$travel_backup_dir/data.git"
git -C "$travel_backup_dir/data.git" fsck --full
git -C "$travel_backup_dir/data.git" rev-parse refs/heads/main
```

分支不是 `main` 时改为实际数据分支。镜像包含可到达的私人历史与原始EXIF，本机磁盘也应保持私密；这不是可公开分享的安装包。把该快照另存到私人备份介质，后续备份使用新目录，避免只留下会随远端更新的唯一镜像。Git 镜像不包含 GitHub 仓库设置、Actions变量 / secrets或平台环境变量，需按上表分别保留。

需要一致的恢复点时，先暂停自己所有数据写入来源（网页编辑、本机push与导入任务），等正在运行的任务结束再备份。源码更新不会替你暂停写入，也不会自动生成备份。

## 2 · 同步自己的源码副本

### GitHub 网页方式

在**自己的源码 fork**选择 Sync fork → Update branch；有冲突时按 GitHub 提示建立 PR 并保留自己的定制。同步会更新远端分支，可能立即触发已连接的 Vercel / Pages 自动化，先完成备份并选择合适窗口。不要选择丢弃自己提交的强制同步。

随后在本机源码目录执行：

```sh
git switch main
git pull --ff-only origin main
git log -5 --oneline
```

### 命令行方式（也适用于 clone 后建立的独立源码仓库）

先确认 `origin` 是自己的源码仓库，工作区干净。在 `git remote -v` 中没有 `upstream` 时，才执行一次：

```sh
git remote add upstream https://github.com/oiahoon/japan-checkins.git
```

已有 `upstream` 时核对它是否指向原项目。然后：

```sh
git switch main
git pull --ff-only origin main
git fetch upstream
git merge upstream/main
```

出现冲突时先解决并检查差异；暂不继续可执行 `git merge --abort`。不要强推覆盖自己的定制。Node.js >=22.18；在**本机开发副本**验证后才推送：

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run build:basic
git diff --check
git push origin main
```

这组验证不需要私人配置；不要把开发副本当作正在提供服务的生产目录。如果已先在网页同步，推送可能没有新内容。工作流名为 Checks、Verify clone-and-deploy build；检查必须对应自己推送的准确提交，而不是上一轮绿色结果。

## 3 · GitHub 基础版：网页与导入分别更新

**Pages 网页**：源码 `main` 的应用 / 基础版 / 公共资源等路径更新会触发“发布 GitHub 基础版”。纯文档或只更新 `deploy/github-import.yml` 不在该工作流的 push 路径过滤范围内；若确需重新发布网页，可手动运行该工作流。确认对应源码提交的发布成功，再刷新自己的 Pages 地址并重新连接私仓；不要将私人数据放入 Pages 产物。

**数据导入**有两份需要核对的内容：

1. 当前模板在源码的 [`deploy/github-import.yml`](../deploy/github-import.yml)，安装时复制为**数据仓库**的 `.github/workflows/import.yml`。它不是自动同步的引用，源码更新不会替换这份文件。
2. 模板默认每次从同一账号 `japan-checkins` 源码副本的 `main` 读取实际导入脚本。因此**即使没有复制新模板，更新源码main也会影响下一次导入**。维护前应备份数据、避免同时提交新照片；遇到模板 / 脚本配套变更时，先暂停私仓自动导入，等两边一致后再恢复。

更新副本时，在干净的数据仓库工作区先 `git pull --ff-only`，对比新模板与现有 `.github/workflows/import.yml`，合并需要的更新，保留自己的分支 / 源码选择等定制。不要从源码覆盖整个数据仓库，也不要改动 `travel/` 或 `inbox/` 来完成工作流升级。只暂存该文件：

```sh
git add .github/workflows/import.yml
git diff --cached --check
git diff --cached -- .github/workflows/import.yml
git commit -m "Update private travel import workflow"
git push
```

推送这个路径本身会触发 Import private travel photos，可能立即生成一次数据提交。先确认当前 `inbox/`、manifest与批次限制都符合预期；不是无副作用的模板保存。若临时在 Actions 中禁用了工作流，完成两边更新后再启用，并在需要时从实际数据分支手动运行。初次或更新提交工作流的本机认证权限见[Git准备](GITHUB-BASIC.md#git-preparation)。

源码改名时保留 / 核对数据仓库 Actions Variables 中的 `TRAVEL_APP_REPOSITORY`。它只指定仓库，**不指定源码分支**；当前模板的源码 `ref` 固定为 `main`。自行改过这个 `ref` 时，复制模板不能丢掉该定制。数据分支由触发任务的分支决定，网页连接分支、进阶版 `GITHUB_DATA_BRANCH` 应指向预期数据分支。

等导入成功后先pull生成提交，再检查记录并刷新网页。保留已有 `owner`、生成的 `sourceId` 和增量状态；照片换内容仍需重新确认地点与日期。用隔离的 private 测试仓库验证新导入行为后再用于自己的真实照片，不把未运行的数据恢复或生产写入称为已验收。

## 4 · 服务端进阶版更新

### Vercel

沿用现有项目的 Production 环境、数据仓库 / 分支、owner、密码哈希和会话密钥。普通升级无需重新运行 `setup` 或重置这些值。对照 [配置表](SELF-HOSTING.md) 与 [`.env.example`](../.env.example)核对新增配置，保留已发布的登录WAF规则；不要把本机 localhost 地址导入 Production。

已连接源码仓库时，生产分支推送由现有 Git 集成部署。查看部署对应的完整 Git SHA、构建结果和正式域名别名；不是只看到某个历史部署 Ready。不要额外给不可信 Preview 提供生产令牌。上线后登录检查 `/setup`，只读查看已有地图、照片与相册；写入验收应使用隔离数据。

### 自有 Node.js 服务器

下面以**原目录原地更新**为例，会有维护停机。先完成第1节备份，在开发副本通过验证并推送源码；服务器原目录无未提交源码修改，数据写入已暂停。保留原目录的 `.setup/server.env`、现用 `.env.local`、文件权限和持久限流目录，记录升级前的源码SHA。

1. 使用自己现有的进程管理器停止应用，确认旧进程退出；例如已有 systemd 服务才使用 `sudo systemctl stop 你的服务名`。仓库不提供固定服务名或现成unit，不要照抄虚构的 `travel.service`。
2. 在该服务实际工作目录执行下方命令。确认本次pull取得第2节验证过的提交；若远端又前进了，先复核新增差异再继续。

```sh
git pull --ff-only origin main
git rev-parse HEAD
npm ci
npm run typecheck
npm run build
NODE_ENV=production node --env-file=.setup/server.env scripts/doctor.mjs --remote
```

3. 全部成功后通过原进程管理器启动（如 `sudo systemctl start 你的服务名`），检查其状态和日志。启动命令仍是[首次部署指南](SELF-HOSTING.md)中的标准 Next.js 命令：

```sh
NODE_ENV=production node --env-file=.setup/server.env node_modules/next/dist/bin/next start --hostname 127.0.0.1
```

该命令用于说明服务实际执行内容；使用进程管理器时不要再手动启动第二份进程。原服务必须加载相同环境文件并使用原工作目录，以保留默认相对路径 `.local/login-rate-limit`；使用自定义 `PASSWORD_RATE_LIMIT_DIR` 时沿用同一持久目录。不要清空限流文件来“修复”升级。

维持现有 HTTPS 代理、端口和同源地址，登录检查 `/setup` 与已有数据读取。`doctor --remote`只验证读取与配置，不证明令牌能写入。当前GitHub日志格式有向后兼容的可选字段，不需要运行 `db:generate` 或旧Sites/D1迁移；未来版本若改变数据格式，应先阅读该版本迁移要求再升级。

## 5 · 回滚应用与恢复数据分开处理

**应用回滚优先不动数据。** 先暂停写入并保留故障时的数据快照，确认目标旧版能读取当前数据格式；不要假定未来所有版本都能任意降级。

| 部署方式 | 应用回滚方法 |
| --- | --- |
| Pages | 在自己的源码仓库用 `git revert`撤销引入问题的提交（多个提交按依赖逆序处理），审阅后正常提交 / push，等待Pages构建；必要时手动发布。不要回退数据分支来修网页 |
| Vercel | 在现有项目选择平台允许回滚的已知正常生产部署，用Instant Rollback恢复正式别名；它复用旧构建与旧环境变量，不会应用项目设置里后改的变量，须核对凭据仍有效。再修复或正常revert源码，否则下一次生产推送可能重新引入问题 |
| 自有服务器 | 停止服务，在干净的源码工作区 `git checkout --detach 已记录的正常源码SHA`，保持原配置和工作目录，重新 `npm ci`、typecheck、build与生产doctor，再由原服务启动。后续恢复跟踪main前先确认修复，不执行会丢弃本地修改的强制切换 |

Git导入还需同时核对**数据仓库工作流副本**与其引用的**源码版本**。只回滚Pages或Vercel不会回滚导入器。需要固定旧导入器时，部署者可在自己的数据工作流中将源码checkout步骤的 `ref: main`临时改为已验证的完整源码SHA；勿改错数据checkout步骤的分支。保留工作流定制，并在隔离数据验证后再恢复导入。

**只有数据本身损坏或误改才考虑数据恢复。** 先停止所有写入，保留现状和备份，在不提供服务、没有自动导入任务的私人本机目录查看备份目标提交。整体恢复必须把同一提交的索引、照片、manifest与增量状态一起核对；只恢复index可能引用不存在的图片，只恢复manifest可能再次覆盖记录。确认owner、分支与源码兼容后，以新的普通提交表达恢复结果，不强推或重写历史；这会撤回恢复点之后的数据修改，必须先逐项评估。

恢复提交若涉及 `inbox/`、`travel/import.json`或工作流文件，会触发导入，不能边恢复边让自动化重写结果。待恢复方案在隔离副本验证并明确选择恢复范围后，才由部署者应用到实际数据分支，检查读取后恢复写入。当前没有一键恢复、自动回滚数据或清除Git历史的功能。本文不提供会直接覆盖生产数据的复制粘贴命令。

官方操作参考：[同步fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/syncing-a-fork)、[Git镜像备份](https://docs.github.com/en/repositories/archiving-a-github-repository/backing-up-a-repository)、[git revert](https://git-scm.com/docs/git-revert)、[Vercel回滚](https://vercel.com/docs/instant-rollback)。


## 可选 Redis 适配升级

Redis不成为基础部署依赖；照片与主记录始终在GitHub。服务端更新前，检查KV开关、每项目/环境独立namespace以及REST凭据对；共享Free库同时共享读写权限与总额度。平台原生连接仅需把Secret交给服务端，不把生产密钥拉到本地。旧部署会继续忽略KV开关，重新部署包含适配代码后才生效。登录限流不会因接入Redis自动切换。

升级后主人打开 `/setup` 默认只读检查；可明确运行隔离短TTL写入锁验证，不能用部署Ready替代运行时结果。回滚可设 `JOURNAL_KV=off` 后重新部署；若曾单独选择 `PASSWORD_RATE_LIMIT=redis`，先恢复此前已验证的WAF或持久单机file模式，避免关闭KV后无法登录。回滚不需要迁移照片或主记录，也不要删除共享库、轮换共用凭据或断开其他项目。详见 [KV配置、验证和限制](KV.md)。
