# 地区层级与验收（2026-10-03）

## 本次目标与交付

已实现中国 → 四川 → 成都区县的可返回导航，成都 20 个区县选择、地图缩放与拖拽、到访过滤、照片拼图与地图导出。常用地区是设备浏览器 localStorage 偏好；设置和浏览不新增旅行历史，不同步其他设备。现有中国 34 个省级地区都可设为常用地区，尚未逐省提供市县下钻。

GitHub 记录增加可选 district（读写默认空字符串），同时保留 country=CN、prefecture=四川省、city=成都市。保存区县仍由用户确认选择；EXIF GPS / 日期只作建议。旧记录有用户已确认坐标时可按区县轮廓呈现，没有区县和坐标则不猜测归属。不修改历史记录或旧 Sites 数据结构。

区县地图使用原有认证照片接口与共享拼块算法。单照片 cover 不平铺，多照片互锁边且外层裁切到区县。只有明确匹配的已保存关联照片参与；草稿排除。导出可独立切换拼图、只在用户开启时嵌入照片，位置仍独立控制，笔记和相机 metadata 不输出。

## 来源与使用边界

- 数据：geoBoundaries gbOpen CHN ADM3，boundaryID CHN-ADM3-62558664，represented year 2017，source Lee Beryman / OpenStreetMap，ODbL 1.0。API：https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM3/ 。源版本：https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/CHN/ADM3/geoBoundaries-CHN-ADM3_simplified.geojson 。
- 修改：仅选择成都 20 个区县、多边形统一 MultiPolygon、坐标四位小数、中文显示名；保留 sourceName。双流县、郫县、新津县显示为双流区、郫都区、新津区，轮廓仍为来源年份参考，不宣称现行行政边界。数据副本 public/chengdu-districts.json 及其衍生数据库适用 ODbL；项目其他代码与私人日志不因独立数据文件改变许可。
- OSM 署名与许可：https://www.openstreetmap.org/copyright 。导出携带来源年份、版权地址和 SVG metadata。地图是旅行可视化参考，不是官方规划或导航服务。

## 道路 / 地铁后续方案（未实现）

规划为可独立关闭的城市背景图层，按缩放层级显示，不作为照片归属或访问证明。采用来源可追溯的公开矢量快照或用户配置的地图服务，记录更新时间和许可，不把私人 GPS 上传给第三方地理接口。地铁按线路 / 站点绘制，不提供实时运营或路线规划。

标准 OSM 瓦片服务不能作为批量下载、离线预取或无限免费服务；须遵守 https://operations.osmfoundation.org/policies/tiles/ 。真实接入前另验收坐标系、最新覆盖、来源署名、暗调可读性与导出兼容。本轮没有伪造道路线条，也没有上线道路 / 地铁开关。

## 验收证据

- 本机 Next.js 主人会话 http://127.0.0.1:3000，标题「我的旅行足迹」，成都区县地图实际加载、20 个交互区域，主页面无阻挡层。
- 中国 / 四川 / 成都面包屑返回、地图缩放及重置、常用地区设置后刷新恢复；没有写入到访。
- 拼图主开关开启后导出继承开启；独立精确落点保持关闭；实际点击 PNG 下载出现生成成功和直接保存链接。空记录没有伪造照片。
- 暗调 390×844 手机地图与浅色 1280×720 桌面验收；修复工具栏文本挤压和手机面包屑占用导致地图底部溢出。运行时 warn/error 日志为空。
- 截图保存在本次工作站 /tmp/chengdu-region-desktop.png、/tmp/chengdu-region-mobile.png（不进入 Git）。
- 自动化测试覆盖 20 区县轮廓、CN / 成都范围隔离、旧 district 缺失兼容、只着色明确区县、导出来源、区县照片裁切与无归属排除，连同既有 GPS/同意/所有权/元数据/重试测试一起运行。
- 本机没有私人 GitHub 数据 token；真实用户照片保存 → 成都区县拼图 → 导出的最终链路仍待真实使用验证。没有为了验收写入虚构行程。
