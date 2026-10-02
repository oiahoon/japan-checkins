# 地理数据与导出来源

公开概览数据下载于 2026-10-03，无用户照片、轨迹或私人 EXIF。以经度 / 纬度 WGS84 为输入，转换成统一 MultiPolygon，保留内环，四舍五入到 4 位小数。视图和导出采用同一批数据；投影为按纬度调整横轴比例的平面概览，不是导航地图或官方审定边界。

## 中国与四川

34 个省级 feature：geoBoundaries gbOpen CHN ADM1，boundaryID `CHN-ADM1-43563684`，表示年份 2019，上游构建 2023-12-12，源标注 Public Domain。

- 元数据 / 许可：[geoBoundaries API](https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/)
- 固定数据：[9469f09 的 GeoJSON](https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CHN/ADM1/geoBoundaries-CHN-ADM1.geojson)
- 原始 SHA-256：`3a00467a0db9b4136facb5f2f3d0edbfd96adb15651cfdf63991da9281030e85`
- 产物：`public/china-simple.json`

四川复用其中的四川省轮廓；21 市州作为筛选项，未绘制市州 / 县界，也不为没有坐标的记录捏造城市中心落点。省级英文名称翻译为中文；上游的 `Ningxia Ningxia...`、`Xinjiang Uyghur...`、`Guangzhou Province` 名称由显式别名表规范为宁夏、新疆、广东，几何不作行政调整。市州数量参考[四川省政府公开资料](https://www.sc.gov.cn/10462/10464/10797/2025/3/10/238bfb3130d44cecbdba65967a5fbcb4.shtml)。

## 世界

Natural Earth 1:110m admin-0 countries，177 个国家 / 地区 feature。低分辨率不包含所有小国与小岛，当前选择器覆盖这些 feature；完整国家选择器、微小地区与更细地理层仍在路线图。

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
