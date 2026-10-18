# 可选 Redis 协调

2026-10-18：代码适配已实现；经用户明确同意共享既有Upstash Free数据库及长期连接后，已通过Vercel原生Connect仅连接目标项目Production。平台自动注入5个Secret变量，未读取、复制或手动传输密钥。另已保存Production的 `JOURNAL_KV=redis` 与 `JOURNAL_KV_NAMESPACE=japan-checkins:production`；现有登录限流方式未改。功能提交bfff195已发布，正式域名真实PING、SET NX、EVAL、TTL和锁语义验收通过，见[PROGRESS](PROGRESS.md)。GitHub 基础版继续只读且不依赖 KV；进阶版未配置 KV 时继续原有 GitHub 原子提交。

## 供应商与免费边界

旧 [Vercel KV 已停止提供](https://vercel.com/docs/redis)，新资源通过 Marketplace 安装。优先候选为 [Upstash for Redis](https://vercel.com/marketplace/upstash/upstash-kv)，使用官方 [REST API](https://upstash.com/docs/redis/features/restapi)，无新增 npm 依赖。

核对当日 [Upstash 定价](https://upstash.com/pricing/redis)：Free 标价 $0/月、500K 命令/月、250 MB 数据、10 GB 流量/月。页面比较表另写256 MB，此处保守采用250 MB，最终以安装页为准。Free 不是按量付费的“免费额度”：后者本身收费，不能选择。官方 [配额故障说明](https://upstash.com/docs/redis/troubleshooting/max_requests_limit) 表明超月度请求数会报错；[添加付款方式](https://upstash.com/docs/redis/howto/upgrade-database)本身会自动转按量付费，与Auto Upgrade开关是不同机制；关闭Auto Upgrade不代表可以添加付款方式。因此不添加付款方式、不选择 Pay as You Go / Fixed / Prod Pack，不开启自动升级。多个环境共用一个免费数据库时共用额度；Lua内部命令也要按供应商实际统计评估，不把一次HTTP请求等同一次计费命令。

另核对 [Redis 官方 Marketplace](https://vercel.com/marketplace/redis) 与 [Redis Cloud 定价](https://redis.io/pricing/)：也列 Free、$0、单库30 MB。其最终安装权限、免费配额与合同未完成账户内核验，本适配器只支持Upstash REST，不能直接使用Redis Cloud连接串。另据 [Redis官方TLS文档](https://redis.io/docs/latest/operate/rc/security/database-security/tls-ssl/)，其Free档不支持TLS，不作为本次替代。没有创建第二个供应商或引入另一套客户端。

**免费法律边界仍待核实**：[Upstash 服务条款](https://upstash.com/trust/terms.pdf) C.6 对过量带宽保留限流、暂停或附加费权利；H章节同时说明免费账户无需付款信息。定价页的免费标示与这一宽泛条款不能由我们解释成绝对零付费承诺。本次没有接受新条款或新建资源；若要求任何情况下都不得产生付费承诺，应先取得供应商对Free硬限额及费用豁免的明确说明，不能用“没填卡”代替合同确认，也不能代用户批准收费。

安装涉及 [Vercel 服务条款](https://vercel.com/legal/terms)、[Marketplace 服务条款](https://vercel.com/legal/integrations-marketplace-service-terms)、Upstash服务条款及其纳入的 [DPA](https://upstash.com/static/trust/dpa.pdf) / [隐私政策](https://upstash.com/trust/privacy.pdf)。Upstash条款还允许清理不活跃免费资源；KV不承担永久存储或持久任务队列职责。

## 当前连接与后续授权检查点

本次新建向导未提供Free，仅有付费档；官方Free最多一个数据库，账户已有活跃Free库，与页面现象一致，但页面未明确说明隐藏套餐的原因。最终经用户同意复用既有Free库，未新建数据库、不增副本或付款方式、不更改Auto Upgrade。既有项目的Production / Preview / Development连接保留；新项目只连接Production。

原生Connect的Sensitive保持开启，平台注入 `KV_URL`、`KV_REST_API_TOKEN`、`REDIS_URL`、`KV_REST_API_URL`、`KV_REST_API_READ_ONLY_TOKEN`，仅核对名称、Secret类型和环境，没有打开值。适配器使用REST URL及读写token。命名空间仅隔离键名，不隔离凭据权限或总额度；用户已被明确告知并接受共享边界。不得访问或改写另一个应用的键。

创建或连接前，应展示具体计划、费用边界与权限并获得确认。此次原生Connect没有出现新的OAuth、条款或付费步骤；没有接受新供应商合同。连接器此前读取集成配置403，未重试该路径；用户完成Chrome登录后通过正常网页操作，未绕过访问限制。后续若出现更广权限、新条款或收费必须暂停。

本次长期连接与自动注入凭据已获授权并完成；用户已批准提交、推送及生产发布，功能提交bfff195已上线并完成隔离键运行时验证；证据见PROGRESS。没有读取现有 `.env.local` 或拉取云端密钥；没有更改公开、付款、安全设置或既有项目连接。Vercel提示新部署后环境变量才生效；已由main推送触发正式部署，没有另行点击Redeploy。

## 配置

只配置服务端环境变量，禁止 `NEXT_PUBLIC_`：

```dotenv
JOURNAL_KV=redis
JOURNAL_KV_NAMESPACE=japan-checkins:production
UPSTASH_REDIS_REST_URL=<供应商 HTTPS origin>
UPSTASH_REDIS_REST_TOKEN=<安全配置的读写令牌>
```

也接受Marketplace旧命名 `KV_REST_API_URL` + `KV_REST_API_TOKEN`。两套凭据不混用；出现任何Upstash主命名时必须完整，不能从另一套补token。不使用只读token来执行协调。只接受 `https://*.upstash.io` 根origin，无用户名、密码、路径、查询或跳转；端点变化需审阅适配，不放宽为任意地址。

默认 `JOURNAL_KV=off`，即使供应商注入凭据也不会自动启用。显式开启却缺配置时写入503，不悄悄回退实例内存。命名空间必填且只允许3–100位字母、数字、冒号、下划线、短横线。每项目、每环境独立；生产与Preview不能共用namespace，多个Preview分支也需隔离。凭据可只分配Production，Preview继续关闭；本地不拉生产token。

如需使用分布式登录限制，单独设置 `PASSWORD_RATE_LIMIT=redis`；每命名空间**全站共用5次/60秒**，自首次请求起计时，不按客户端IP分桶，拒绝请求不延长窗口。多人或攻击者可能耗尽全站登录窗口，这是个人站的保守边界。Redis不可用、额度耗尽、配置缺失均拒绝登录，不退回实例限制。它不替代平台对函数调用量、恶意流量、费用的边界保护；现有WAF设置不变。没有自动修改已用的 `vercel-waf` / `file` 选择。

`npm run setup` 保留已有KV配置及显式Redis限流选择，不生成Redis凭据；`npm run doctor` 只校验配置，`npm run doctor -- --remote` 或主人 `/setup` 默认额外只读PING。主人可主动展开“验证 Redis 写入锁”并运行受认证、同源POST `/api/setup/kv-check`：固定在本项目namespace下追加 `:verify:<随机UUID>`，测试PING、SET NX、EVAL、TTL到期、互斥、释放与旧持有者保护。测试不接受客户端键/命令；键最长60秒TTL，通常主动清理。不会访问GitHub、真实业务键或另一项目namespace，不返回键值或凭据；会消耗少量共享命令额度。PING成功仅证明可连接，不能证明SET/EVAL权限、Free计划或真实写入已经验收。

## 实现与故障语义

- `lib/journal-kv.ts` 在运行时惰性读取配置，以POST JSON调用官方REST命令。每次网络操作含响应读取最多2秒，不自动重放不确定的写命令。供应商HTTP失败、配额错误、异常JSON均转通用错误，不回显token、URL或供应商原始错误。
- 仅服务端 `githubAPI` 为 `GitHubStore.mutate` 注入协调器；基础版的共用只读Store不引入Node Redis模块。鉴权、owner / origin检查、private仓库核验保持在前。
- 租约键包含namespace、版本、用途，以及仓库 / 分支 / owner元组的SHA256。只存随机租约token，不存照片、EXIF、笔记、主记录、PAT或登录密码。仓库名大小写归一；不同owner和数据分支分离。
- `SET NX EX 60` 原子抢占，不排队、不轮询；忙返回409 / Retry-After:2。Git写入仍受原55秒预算、10秒单请求和最多3次Git冲突重试约束；新Store构造时开始预算，获取租约不延长它。Lua比较token后删除，旧进程不会删除后来者的锁；崩溃或释放失败靠60秒TTL恢复。
- 租约是减少冲突的辅助协调，不是提交事实或跨系统事务。锁过期/服务端时钟/失效转移不能替代Git的非强推CAS；Git仍重读head并合并。Redis租约获取失败/超时不会开始索引修改；失败发生前可能已有未引用的Git照片blob，沿用原上传重试，不会把它当已保存。
- Git提交成功后释放失败仍返回保存成功；响应丢失则沿用原照片/记录ID，从Git重读恢复幂等，TTL不丢失已保存照片。只在Git ref提交成功后显示已保存。Redis故障返回503 / Retry-After:60，保留用户输入，原客户端由用户重试。
- 本次不缓存成功响应或主记录，不创建任务状态/进度API、后台消费者、批次暂存或自动重试队列；未来批处理仍见 [BATCH-PROCESSING](BATCH-PROCESSING.md)。不因新增租约而宣称一次提交整个照片批次。

## 验收、启用和回滚

合成测试覆盖配置/凭据对、故障/配额/超时、并发锁/TTL/继任者安全、全局限流、Git丢响应幂等、owner、只读与同源原契约。可运行：

```sh
npm run typecheck
npm test
npm run build
npm run build:basic
# 可选：本机已安装redis-server / redis-cli，无外部服务
node --experimental-strip-types scripts/verify-kv-local.mjs
```

本次结果：163项合成测试、typecheck、Next构建通过；基础版在隔离副本以 `--configLoader runner` 避免只读依赖目录的Vite临时写入后构建通过。真实本机Redis的生产Lua检查通过；静态JS未包含新增KV配置/合成密钥字符串。平台连接与变量范围、正式域名的真实REST/SET NX/EVAL/TTL/锁语义已验收。多实例压力及真实旅行写入未纳入本轮。

本机Redis检查只创建临时Unix socket（无TCP监听），直接执行生产Lua以核验原子语义，结束删除临时数据。合成REST测试不能替代实际Upstash账户/REST/计划/权限验收。

连接和发布已完成。未来升级后的验证仍只能使用本项目命名空间；先在隔离环境用独立namespace和合成数据执行SET/EVAL/TTL、两实例争用、配额/连接失败、重复提交与丢响应恢复；经同意再重新部署到目标环境，核对commit、部署Ready、正式域名、无凭据输出。生产只读PING后，实际保存应由主人明确操作；未完成不得报“线上KV可用”。不把本地Redis验收当作云端验收。

回滚时若登录选择redis，先恢复此前已验证的 `vercel-waf` 或持久单机 `file`，然后设 `JOURNAL_KV=off`，经发布授权后重新部署。不能关闭KV却留下redis登录模式，后者会拒绝登录。无需迁移GitHub数据，也不自动删除数据库/凭据；撤销连接和资源删除另行确认。
