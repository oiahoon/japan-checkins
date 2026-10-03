# 地理数据与导出来源

公开概览数据下载于 2026-10-03，无用户照片、轨迹或私人 EXIF。以经度 / 纬度 WGS84 为输入，转换成统一 MultiPolygon，保留内环，四舍五入到 4 位小数。视图和导出采用同一批数据；主地图采用统一经度 / Mercator 纬度概览（纬度截断 ±80°），导出仍按作品画幅使用纬度调整的平面投影；二者共享原 WGS84 数据。不是导航地图或官方审定边界。

## 中国与四川

34 个省级 feature：geoBoundaries gbOpen CHN ADM1，boundaryID `CHN-ADM1-43563684`，表示年份 2019，上游构建 2023-12-12，源标注 Public Domain。

- 元数据 / 许可：[geoBoundaries API](https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/)
- 固定数据：[9469f09 的 GeoJSON](https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CHN/ADM1/geoBoundaries-CHN-ADM1.geojson)
- 原始 SHA-256：`3a00467a0db9b4136facb5f2f3d0edbfd96adb15651cfdf63991da9281030e85`
- 产物：`public/china-simple.json`

四川使用 21 市州的实际边界，支持点击 / 键盘选择；不为没有坐标的记录捏造城市中心落点。省级英文名称翻译为中文；上游的 `Ningxia Ningxia...`、`Xinjiang Uyghur...`、`Guangzhou Province` 名称由显式别名表规范为宁夏、新疆、广东，几何不作行政调整。市州数量参考[四川省政府公开资料](https://www.sc.gov.cn/10462/10464/10797/2025/3/10/238bfb3130d44cecbdba65967a5fbcb4.shtml)。

## 世界

Natural Earth 1:110m admin-0 countries，177 个国家 / 地区 feature。低分辨率不包含所有小国与小岛，当前地图搜索 / 点击覆盖这些 feature；完整国家选择器、微小地区与更细地理层仍在路线图。

- [使用条款：Public Domain](https://www.naturalearthdata.com/about/terms-of-use/)
- [固定数据版本 9380cca](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_110m_admin_0_countries.geojson)
- 原始 SHA-256：`6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`
- 产物：`public/world-simple.json`

使用上游 NAME_ZH / NAME 和 ISO_A2_EH；上游没有二位编码时保留 ADM0_A3。CN 和 TW 的旅行显示名分别规范为“中国”“台湾地区”。来源资料存在不同的边界表达，导出保留来源署名与简化概览说明，不宣称是权威行政产品。

## 复现

将上述固定原始文件下载到仓库外，再执行（Python 3 标准库，无附加依赖）：

```sh
python3 scripts/prepare-geography.py --china /tmp/china-adm1.json --world /tmp/world-countries.json
```

脚本核对原始文件 SHA-256，写入两份公开地理资产；上游更新必须显式更新脚本校验值并重新审查名称、边界、许可和测试。日本来源继续见 `public/data-notes.md`。

## 导出契约

`lib/travel-poster.ts` 根据已保存记录生成确定性 SVG，标题和汇总文本进行 XML 转义，不内嵌脚本、远程图片、照片、笔记、地点名或记录 ID。默认不输出精确点；开启时仅使用已保存的纬经度。次数只来自 dated visits，历史深度不进入成就统计。按年筛选由 UI 完成。

A4 为 2480×3508、桌面为 3840×2160、手机为 1440×2560；PNG 由浏览器 Canvas 栅格化；中文使用本机字体。打印使用当前画幅适配 A4 页面，非 A4 比例留白。系统分享不可用时下载文件，站点不接收或托管新的分享数据。

## 市州与海岛细化快照

四川：geoBoundaries gbHumanitarian CHN ADM2，`CHN-ADM2-99377448`，表示年份 2020，来源 HDX / publicly available online sources；许可 **CC BY 3.0 IGO**，本项目筛选 21 市州、翻译名称并将 WGS84 几何舍入至 5 位小数。保留来源署名，修改不代表来源背书。

- 元数据与许可：https://www.geoboundaries.org/api/current/gbHumanitarian/CHN/ADM2/
- 原始文件：https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbHumanitarian/CHN/ADM2/geoBoundaries-CHN-ADM2.geojson
- 上游来源：https://data.humdata.org/dataset/cod-ab-chn
- 许可全文：https://creativecommons.org/licenses/by/3.0/igo/
- SHA-256：`12af10d8810b00d7258df7cc6cafa70023a3db41fc48e9f69846f6cfa543ac0b`
- 产物：`public/sichuan-cities.json`。这是市州概览，不含县区 / 街道级边界。

西沙：Natural Earth 1:10m land，固定同一 `9380cca` 快照，Public Domain。仅提取经度 110–114、纬度 15–18 范围内的 **18 个物理岛屿简化多边形**，附加于海南省 feature；没有增加省级条目，没有绘制海上主张线。不是完整岛礁名录。原始几何在全国概览非常小，因此另设“西沙群岛 / 局部放大 · 非同比例”，屏幕和 SVG 导出共用这一分层。放大框以真实几何定位，不用装饰点代替岛屿或访问记录。

- 原始文件：https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_10m_land.geojson
- SHA-256：`1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416`
- 产物：补充 `public/china-simple.json` 海南几何。沿用 Natural Earth Public Domain 条款。

先运行上面的省级 / 世界脚本，再运行（重复运行不重复增加海岛）：

```sh
python3 scripts/prepare-map-details.py --prefectures /tmp/chn-prefectures.json --islands /tmp/land-10m.json
```

两个脚本均使用标准库和固定 SHA；不可用来源不以任意第三方“代码 MIT”替代数据许可。此次检查发现 gbOpen CHN ADM2 有 2391 个单位，实际粒度不能直接当作 21 市州，因此采用上述独立 gbHumanitarian 数据。

## 连续层级与日本市区町村名称修正

世界 / 亚洲 → 国家 → 已有行政细节。亚洲使用经度 35–155、纬度 -12–65 的视窗，并保留 Natural Earth 同一快照的 CONTINENT 属性供无坐标记录筛选；不是政治 / 行政边界。其他国家停在国家层，中国其他省停在省层。地图相机在换层时保持原坐标，不采用局部非同比例插图；西沙 18 岛原几何未删除、可放大查看，导出原插图继续保留。

日本市区町村：1751 个由 SmartNews 处理的 2021 MLIT 区域。原导入错误地在町村优先使用 N03_003（郡名），本轮将 932 个标签改为真实 N03_004，补 municipalityCode=N03_007、county=N03_003。原 feature ID、顺序和四位小数几何逐项验证不变；没有更新边界年份。政令指定都市仍合并为市，不包含内部区层。北海道两个“泊村”使用源 ID 分开，记录无确认坐标时不能猜选其中一个。

- 固定源版本：[SmartNews ebabf6a](https://raw.githubusercontent.com/smartnews-smri/japan-topography/ebabf6a0f1b26eacce279566ac1e29a4da474ee5/data/municipality/geojson/s0010/N03-21_210101_designated_city.json)
- 原始 SHA-256：`8e38c250108fbf40a2307bd8a6ba905c0995e1511fcf83fdfab3318acbcbd4e8`
- MLIT 国土数值信息；[SmartNews 上游复用 / 署名说明](https://github.com/smartnews-smri/japan-topography#クレジット)明确要求保留国土交通省来源署名。几何数据与应用代码许可分开，现有 MLIT 2021 / SmartNews 署名保留。
- 名称修正复现：`python3 scripts/prepare-japan-municipal-names.py /tmp/japan-municipal-source.json`，之后 `node scripts/build-place-index.mjs`。

此轮不增加私人地理数据，不重新识别或改写用户记录。地图层级和照片裁切仅使用明确地区 / 确认坐标。导出仍是五种既有地域作品，不新增亚洲或日本单个市的海报投影。
