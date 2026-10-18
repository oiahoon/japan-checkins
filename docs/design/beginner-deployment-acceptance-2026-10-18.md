# 新手部署独立验收 · 2026-10-18

## 环境与复现边界

按GETTING-STARTED的GitHub基础版路径验收，使用全新公开源码副本 `oiahoon/travel-guide-qa-20261018`、全新private数据仓库 `oiahoon/travel-guide-data-qa-20261018` 与独立 [Pages网址](https://oiahoon.github.io/travel-guide-qa-20261018/)。没有复用原生产数据仓库、旧QA数据或Vercel项目。

当前账号是原项目作者，无法以同名在自己账号再Fork一次；因此源码使用已发布提交1d984ac的干净文件快照创建独立仓库，不复制历史。实际测试了源码改名后设置TRAVEL_APP_REPOSITORY的路径，不能据此声称已验收另一账号的Fork按钮。测试副本修正提交421c5f1包含本轮代码，Pages [39128650837](https://github.com/oiahoon/travel-guide-qa-20261018/actions/runs/39128650837)、Checks 39128650773及clone-and-deploy 39128650822均success。

本机没有GitHub Desktop；仓库创建 / Pages设置使用GitHub CLI/API，Commit / Push / Pull使用Git，网站使用内置浏览器实际操作。未把等价Git命令说成GitHub Desktop图形按钮已实测，也不是零基础真人试用。测试只用程序生成的JPEG，EXIF品牌Synthetic、拍摄日期2020-01-02、无GPS；手填地点明确标为合成验收。

## 真实执行结果

| 步骤 | 证据 / 结果 |
| --- | --- |
| 发布源码副本 | 首次Pages [39128077429](https://github.com/oiahoon/travel-guide-qa-20261018/actions/runs/39128077429) success；独立子路径实际打开连接页 |
| 安装数据仓库工作流、空日志初始化 | [39128081816](https://github.com/oiahoon/travel-guide-data-qa-20261018/actions/runs/39128081816) success，自动生成空index / manifest，无需旧日志 |
| 添加一张照片 | [39128262927](https://github.com/oiahoon/travel-guide-data-qa-20261018/actions/runs/39128262927) success；Pull回读1张照片、0到访、confirmed=false；保留拍摄日期 / 相机提议，无GPS，无东京兜底 |
| 模拟JSON编辑错误 | [39128682453](https://github.com/oiahoon/travel-guide-data-qa-20261018/actions/runs/39128682453) **预期failure**；提示travel/import.json语法错误，未执行生成提交；已有index SHA256保持不变 |
| 修复JSON并明确确认 | [39128896084](https://github.com/oiahoon/travel-guide-data-qa-20261018/actions/runs/39128896084) success；Pull回读1张照片、1到访，CN / 四川省 / 成都市 / 合成验收地点 / 2020-01-02，坐标null；sourceId保持 |
| 重跑同一导入 | [39129040973](https://github.com/oiahoon/travel-guide-data-qa-20261018/actions/runs/39129040973) success；仍1张 / 1到访，数据分支HEAD与重跑前相同，没有重复提交 |
| 派生照片隐私 | 实际派生JPEG不含EXIF；inbox原文件仍在private Git历史，不声称永久删除原始元数据 |
| 浏览器填写错误 | 粘贴完整仓库URL时，旧版笼统提示填写仓库 / 令牌；修正版明确要求用户名/仓库名 |
| 真实读取权限不足 | 用户手动提供的测试令牌可读私仓metadata（200），读取index返回403 Resource not accessible by personal access token；修正版站点明确提示Contents权限 / 组织批准 / 请求额度，不再误导检查分支 |

## 找到的卡点及改进

1. 仅选中仓库、只有Metadata权限仍不能读照片。新手指南明确进入Repository permissions添加Contents只读，并区分网页与服务端令牌；应用403提示同步修正。
2. 容易把完整GitHub网址填进仓库框。连接配置按仓库、分支、令牌分别反馈，不改变严格的单仓库网络限制。
3. 源码改名需要另设变量，但新手原先要跳到另一文档找。六步指南直接给出变量所在仓库、位置、名字和示例值。
4. JSON填错后原脚本仅输出笼统英文失败。现在显示安全的出错文件名和中文排查提示，不输出异常原文或私人字段；空JSON也按格式错误处理。新增回归验证格式错误发生在写入之前且不泄露合成私人笔记。
5. 新站初始地图不一定是所记录国家。指南补充“时间线 → 查看地图”定位已确认记录，说明地区浏览与记录丢失的区别。
6. 已保存独立照片时，时间线摘要仍显示0条记录，容易被误认为数据丢失。摘要统一为记忆总数与照片数，与实际卡片一致，不自动创建旅行相册。

## 浏览器最终闭环：已通过

用户手动补齐Contents只读权限后，直接在独立Pages站点使用真实私仓数据验证；没有在浏览器注入合成响应或用CLI广泛令牌替代网页授权。

- `qa-unconfirmed`是真实首次导入的Git快照：照片库1张 / 1张未标记，2020-01-02标为待确认，地点 / 笔记待补充；图片实际加载成功，点照片打开只读查看器。时间线是独立照片及待确认日期，没有虚构到访或网页编辑入口。
- `main`是明确确认后的数据：照片库1张 / 0张未标记，显示中国 / 四川省 / 成都市 / 合成验收地点、日期和手填笔记，以及“已标记地图”。
- 从时间线“查看地图”自动进入成都市，地区面板为1次到访；返回四川省时成都区域显示已记录。坐标为null，不伪造具体道路落点或区县访问。
- “收藏旅行地图”生成四川省作品预览，成都区域朱红高亮。验证了预览，不据此声称已完成PNG下载、系统分享或实体打印。
- 刷新后回到空的连接表单，仓库和令牌字段为空；全新会话使用main重新授权，照片、日期、笔记和地图入口再次正确回读。
- 本轮又发现时间线摘要把独立照片排除在“记录”计数之外，容易误解为保存失败。修改为实际展示的记忆总数和照片总数；独立站点提交bfe6189，Pages [39131002178](https://github.com/oiahoon/travel-guide-qa-20261018/actions/runs/39131002178)、Checks39131002168、clone-and-deploy39131002171均success。实际页面显示“1条记忆 · 1张照片”，没有推断或合并旅程。
- 实际浏览器1280×800和390×844检查，手机页面宽度与内容宽度同为390px；全新成功授权会话无console错误 / 警告，页面无框架报错或空白。旧会话此前的权限403属于已复现、已由用户修正的授权问题。

至此完成基础版的实际Git / Actions / Pages / 私仓网页读取闭环。未覆盖的另一账号Fork、Desktop按钮和真人新手试用继续保留范围说明，不能把技术执行成功表述成零配置或零基础用户必然能完成。

## 安全与交接

令牌由用户手动提供，仅保存在Git以外的本机临时文件并限制文件权限；没有输出、提交或写入Actions/Pages。没有把本机广泛CLI凭据交给托管网页。令牌管理页面被自动审批拒绝后改为用户手动操作，没有换浏览器绕过；公开测试源码使用无历史文件快照，避免复制历史敏感内容。

本轮本机typecheck、Next生产构建、164项合成测试、基础版构建、106文件静态隐私扫描通过。真实手机 / Desktop客户端 / 不同账号Fork / 服务端进阶部署不是本轮已完成范围。临时照片、元数据和截图不提交公共源码。
