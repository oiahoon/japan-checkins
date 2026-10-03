# 国内市县目录与边界覆盖（2026-10-03）

## 已实现

名称目录覆盖项目现有 34 个省级地区，共 393 个市州 / 直辖单位及 3336 个下级地名。内地使用国家统计局 2023-06-30 快照：333 个地级单位、32 个省直辖县市等单位和 4 个直辖市；2942 个下级条目含 124 个统计用开发区 / 类似区域，**不是 3336 个正式行政县**。台湾使用 2021 公开快照，22 个县市、368 个乡镇市区；香港 18 区；澳门为 7 堂区地理分区及路氹填海区，不称作现行行政县。

北京市 / 天津市 / 上海市 / 重庆市下不显示“市辖区”“县”虚层；地图直接由直辖市进入区县，不重复显示同名城市层；省直辖单位直接进入自己的区域。东莞 / 中山 / 嘉峪关不虚构行政县，也不将 9 位街镇统计编码当作县。内地市县 / 台湾原编码与完整父级保留，同名城区、朝阳区、西湖区不合并。直辖市展平使用省级前缀加00作为内部节点ID，港澳使用81/82前缀内部ID；这些派生ID不是官方发布的行政编码。繁简别名只用于搜索，保存采用来源的规范名称。

主地图：世界 → 亚洲 → 中国 → 省 → 市州 / 直辖单位 → 区县。点击聚焦，连续缩放切层、拖拽和返回保留；名称搜索、照片所属地区调整都覆盖全部目录。照片编辑保存可选 district，卡片 / 重读 / 地图筛选保留区县；旧数据兼容，不批量重写已保存行程。位置和日期仍由保存动作确认，名称目录不生成坐标、不推断访问。

几何是独立的历史参考：新增资产中 382 个市级等区域、2663 个下级区域已匹配公开多边形，其中台湾 22 / 368。既有成都 20 区县显示映射仍保留。县级来源为 2017，市级主要为 2020；**名称齐全不代表 2026 现行边界齐全**。旧区重组、改名、统计区域、新成立区域、部分音译及港澳下级边界未可靠匹配时保留可搜索名称，显示上一级地图和短提示，不使用虚构轮廓或中心点。相同名称的旧轮廓也不意味着行政范围没有变化。

## 固定来源与许可

1. 内地名称：modood/Administrative-divisions-of-China 2.7.0，国家统计局 2023-06-30 统计用区划，固定提交 `6fb5380de7e6c961869dcd1629df4adc088fa9bb`。仓库 WTFPL v2；统计用事实数据不是导航或行政许可证明。上游 README 说明国家统计局自 2024 起不再公开该目录，因此不声称本目录含 2024–2026 的全部调整。
   - https://github.com/modood/Administrative-divisions-of-China/tree/6fb5380de7e6c961869dcd1629df4adc088fa9bb
   - https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/6fb5380/dist/pca-code.json
   - SHA-256 `83b7536f853ad16beb4d37b92890a3fd7bb9d33d4f37e7c8885fb948749a9bc4`
2. 市级多边形：geoBoundaries gbHumanitarian CHN ADM2 / HDX，2020，CC BY 3.0 IGO；固定提交 `9469f09`，与已有四川市州同源。保留署名，名称转换、拓扑修复及坐标舍入不是来源背书。
   - https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbHumanitarian/CHN/ADM2/geoBoundaries-CHN-ADM2.geojson
   - https://data.humdata.org/dataset/cod-ab-chn
   - https://creativecommons.org/licenses/by/3.0/igo/
   - SHA-256 `12af10d8810b00d7258df7cc6cafa70023a3db41fc48e9f69846f6cfa543ac0b`
3. 县级多边形：geoBoundaries gbOpen CHN ADM3 / Lee Beryman / © OpenStreetMap contributors，2017，ODbL 1.0，固定提交 `9469f09`。简化文件实际含 2864 个 feature，不能照抄 API 元数据数量。衍生的对应区县文件继续按 ODbL 发布，与应用代码、私有日志分开。
   - https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CHN/ADM3/geoBoundaries-CHN-ADM3_simplified.geojson
   - https://www.openstreetmap.org/copyright
   - https://opendatacommons.org/licenses/odbl/1-0/
   - SHA-256 `ea64fe24f193e319ce48895f229a5b3f46d2a60f3f3df67e6172ab037e4cc8fd`
4. 台湾县市 / 乡镇多边形及名称：内政部国土测绘中心公开资料的 taiwan-atlas `2021.9.20` 固定镜像，非投影 TopoJSON。上游资料按政府资料开放授权条款第 1 版使用；镜像程序 MIT（Daniel Kao），不能以 MIT 代替地理资料署名与条款。当前直连官方 API 失败，采用该固定公开镜像，不绕过 TLS。
   - https://data.gov.tw/dataset/7441
   - https://data.gov.tw/license
   - https://github.com/dkaoster/taiwan-atlas/tree/60ac5fdae46c53f0ddb810c418fdb08b056273d5
   - https://cdn.jsdelivr.net/npm/taiwan-atlas@2021.9.20/towns-10t.json
   - SHA-256 `250f63cdef76679b67d2a34633a69355c8f1180ae6b55407e6c87789940feab0`
5. 香港 / 澳门：仅手工转录公开地名事实，未复制页面设计、照片或地图。香港：https://www.had.gov.hk/en/18_districts/my_map.htm ；澳门： https://webmap.gis.gov.mo/InetGIS/chn/index.html （堂区 / 路氹地理区域）、https://www.dsec.gov.mo/ 。下级几何暂缺；上级沿用已记录来源的省级参考轮廓。

## 可复现生成与审计

输入只接受仓库外上述公开快照，脚本先核对四份 SHA-256。构建依赖仅在生成时使用，不增加应用运行依赖：Python、pypinyin==0.55.0、shapely==2.1.2、opencc-python-reimplemented==0.1.7。

```sh
python3 scripts/prepare-china-admin.py --names /tmp/travel-pca.json --towns /tmp/travel-tw-towns.json --cities /tmp/travel-cncities.json --districts /tmp/travel-cncounties.json
node scripts/build-place-index.mjs
npm test
npm run typecheck
npm run build
```

内地几何连接须同时满足唯一名称 / 音译候选、真实省内代表点、区县位于对应市级范围；音译特例显式记录在脚本。未知或多义候选拒绝连接，没有对新旧行政边界执行无依据的拆分、合并或扩大。省直辖单位仅用可验证的自身轮廓，不画虚构地级市。`buffer(0)` 修复来源拓扑，WGS84 MultiPolygon 保留内环，四位小数。台湾按 TopoJSON delta arcs 和 transform 解码。

市级集合中主体CC BY 3.0 IGO、省直辖单位使用的县级ODbL、台湾政府开放资料和省级Public Domain来源分别保留条件；不把混合来源全部称作单一CC BY。ODbL衍生部分公开分发、与私人日志和代码分离。

产物：china-admin.json 名称；china-cities.json 市级边界；china-districts/{省级编码}.json 按省分片；china-coverage.json 逐省数量、缺失编码及未匹配来源名称。市级层在探索中国时加载；县级只加载当前省，15 秒有界超时，成功缓存，失败保留上一级并提供重试。切换层级不下载全国县级包。默认导出五种既有地域投影保持不变，尚未新增全国任意市县的独立海报。

## 逐地区覆盖

名称数量包含上述统计单位 / 地理区域。边界数量只计算此次新资产，不把无轮廓地名计为已绘制。

| 地区 | 市级等地名 | 下级地名 | 市级等轮廓 | 下级轮廓 |
|---|---:|---:|---:|---:|
| 北京市 | 1 | 16 | 1 | 16 |
| 天津市 | 1 | 16 | 1 | 14 |
| 河北省 | 11 | 190 | 11 | 141 |
| 山西省 | 11 | 121 | 11 | 106 |
| 内蒙古自治区 | 12 | 108 | 12 | 32 |
| 辽宁省 | 14 | 100 | 14 | 80 |
| 吉林省 | 9 | 69 | 9 | 50 |
| 黑龙江省 | 13 | 126 | 13 | 108 |
| 上海市 | 1 | 16 | 1 | 10 |
| 江苏省 | 13 | 104 | 13 | 89 |
| 浙江省 | 11 | 90 | 11 | 81 |
| 安徽省 | 16 | 119 | 16 | 91 |
| 福建省 | 9 | 84 | 9 | 75 |
| 江西省 | 11 | 100 | 10 | 85 |
| 山东省 | 16 | 151 | 16 | 126 |
| 河南省 | 18 | 180 | 18 | 146 |
| 湖北省 | 17 | 101 | 17 | 93 |
| 湖南省 | 14 | 134 | 14 | 116 |
| 广东省 | 21 | 122 | 21 | 103 |
| 广西壮族自治区 | 14 | 111 | 14 | 95 |
| 海南省 | 19 | 11 | 19 | 7 |
| 重庆市 | 1 | 38 | 1 | 31 |
| 四川省 | 21 | 183 | 21 | 161 |
| 贵州省 | 9 | 88 | 9 | 76 |
| 云南省 | 16 | 129 | 16 | 106 |
| 西藏自治区 | 7 | 78 | 7 | 10 |
| 陕西省 | 10 | 107 | 10 | 96 |
| 甘肃省 | 14 | 87 | 14 | 70 |
| 青海省 | 8 | 45 | 8 | 23 |
| 宁夏回族自治区 | 5 | 22 | 5 | 18 |
| 新疆维吾尔自治区 | 26 | 96 | 16 | 40 |
| 台湾省 | 22 | 368 | 22 | 368 |
| 香港特别行政区 | 1 | 18 | 1 | 0 |
| 澳门特别行政区 | 1 | 8 | 1 | 0 |

## 验收与保留限制

110 项合成测试覆盖名称、直辖市 / 直辖县归属、重复地名、全路径区县筛选、几何覆盖审计、无轮廓回退、保存后重读、同意 / 所有权 / 幂等及照片拼图不越级。浏览器验证中国 → 杭州西湖区、同名南昌西湖区候选、照片深圳南山区一键归属和合成保存回显；暗调 390×844、320×740 控件及桌面检查见 PROGRESS。没有为验收上传真实照片或写入私人数据仓库。

未宣称：2026 全量行政调整、全部区县精确边界、街道 / 门牌 / 景点目录、全国精确 EXIF 区县识别、道路 / 地铁 / 离线导航、真实 iPhone 双指 / 实体打印验收。现有 GPS 解析仍只提议可验证的地区，不以目录名称合成经纬度。
