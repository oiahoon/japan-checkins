# 双版本、自部署与Git导入验收 · 2026-10-18

## 最终产品合同

每位用户fork（或clone后push）自己的源码仓库，部署自己的Pages / 服务端，再连接自己的private数据仓库。不会共用作者的网站、照片或凭据。用户最新决定取代前期“基础版网页上传”：**基础版通过Git管理，网页只读；服务端进阶版开启网页上传 / 编辑 / 批量管理。**

基础版源码Actions只发布应用。数据仓库安装deploy/github-import.yml后，其Actions使用内置GITHUB_TOKEN解析inbox照片、生成派生JPEG / EXIF提议 / 索引 / 确认manifest；只有用户在Git中明确确认地点日期才生成足迹。网页使用页内存中的Contents只读token读取私仓，刷新重新授权。需要Git、Pages启用、复制导入工作流和授权，不能称为零配置一键使用。

进阶版是标准Next.js：Vercel或自有持久单机Node均可，保留服务端密码认证、只读访客、可选发布与即时网页操作。Redis只记录了可选任务暂存 / 重试 / 合并提交方案，尚未实现或部署，不是依赖。

## 实现与安全

- BrowserJournal在远程请求前拒绝全部非GET，写入UI隐藏；地图、照片、相册、时间线、拼图与导出保留。未确认照片可在只读viewer查看，提议日期明确标记待确认。
- 私有图片通过GitHub认证blob转临时URL；断开取消请求、清除token并撤销URL。CSP限制同源脚本与GitHub API，静态产物扫描私人目录与凭据。
- Git导入读取前核验private和固定owner，限制路径 / symlink / 大小 / 数量，JPEG校正方向、缩放并去EXIF。源内容ID去重，完整计划验证后才写派生文件，工作流成功后单次提交、非强推；冲突重新运行读取最新分支。输入签名避免相同manifest覆盖后续网页编辑。
- 用户提交的inbox原图与EXIF仍在private Git历史中；派生去EXIF不代表删除原始历史。删除原文件不自动删除已导入记录，软移除 / 恢复需要显式配置。
- setup保留现有配置，生成独立密码 / 哈希 / 会话密钥，目标配置和密码文件600权限；doctor与主人/同源保护的/setup只读检测。
- 可信域名只来自APP_URL或Vercel系统生产域名，不信任Host头。Vercel仍需WAF；单机使用持久原子分钟槽位限流，跨进程 / 重启，文件失败则拒绝。

## 真实外部链路

全部使用独立private QA仓库和合成JPEG，测试凭据仅本机；没有改写既有私人旅行数据或复制生产凭据。

1. 全新源码副本npm ci → setup → private remote doctor → production build/start；经HTTPS测试代理显式验证证书，密码登录与Secure __Host会话通过。
2. 服务端首次空库上传 → 草稿 → 明确地点日期保存 → 旅行记录关联 → 新读取；重复上传/保存不重复记录，原EXIF已清除。匿名/异源/viewer写入被拒绝。
3. 最终生产构建重启后仍回读成功，能读取先前共享格式保存的照片与旅行记录。
4. Git-first测试分支仅提交合成inbox原图与模板工作流；真实Actions [39101495077](https://github.com/oiahoon/travel-onboarding-qa-20261018/actions/runs/39101495077) success。生成3张照片 / 2次到访，新照片无到访，正确保存2020-01-02提议和相机白名单。
5. 仅通过Git编辑import.json明确地点日期/笔记和旅行相册；真实Actions [39101679596](https://github.com/oiahoon/travel-onboarding-qa-20261018/actions/runs/39101679596) success。新读取3张照片 / 3次到访，git照片正确关联git-acceptance-trip并保留笔记。
6. 私仓原图 / EXIF / 派生文件没有进入Pages或源码；未永久删除QA仓库，便于后续核对。

## 浏览器与自动检查

IAB浏览器，本机最终静态构建挂载/japan-checkins/。1280×720、390×844、320×740、亮暗主题检查页面身份、非空、无框架错误覆盖与横向溢出。只读版地图菜单无管理入口，照片页无上传 / 选择 / 批量操作，未标记照片可查看；断开返回连接页且token清空，重新连接回读。

共用私有照片transport验收：地图探索 / 拼图、查看器自然尺寸800px、照片日期/笔记保存回读、PNG生成成功且2张照片data:image内嵌。前期可写基础版的上传验证已由最终只读版取代，不作为当前基础版网页上传宣传。进阶版仍保留对应写入操作。

最终153项测试通过，覆盖只读拒绝所有写入、public/owner拒绝、初始化与限流、提议不生成到访、Git导入去EXIF / SHA、明确确认 / 相册、重复导入、后续网页编辑保护、非法owner / GPS / 边界 / 路径 / symlink / 损坏图片失败。typecheck、Next build、Pages build、106文件安全扫描和diff检查通过。HEIC懒加载chunk较大这一构建提示未被当作已解决的真实机型性能。

## 发布与边界

功能提交648ad52三项CI / Pages发布全部success；Vercel Production dpl_DV7zqwu3H9P1JzCwnwrtwkgwkcFk Ready，正式域名别名已更新。https://oiahoon.github.io/japan-checkins/ 实际加载只读基础版连接页且console无warn/error；https://travel.miaowu.org/ 新会话显示密码页，匿名/api/checkins返回401。Vercel连接器范围403后，使用同团队/项目CLI凭据完成核对，没有改权限。

生产入口未输入本机广泛CLI凭据，私人读取验收在本机同一静态构建使用隔离QA仓库进行；不把公开壳加载等同于生产私仓上传验收。iPhone Safari、实际相机HEIC/RAW、系统分享 / 打印、弱网 / 大图库和Redis任务均保留未验收边界。截图只放工作站临时目录，不进入Git；当前发布收尾见PROGRESS最新条目。
