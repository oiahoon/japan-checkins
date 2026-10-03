"""Build public Chinese name directories and audited, historical map layers.
No private journal input. See docs/GEOGRAPHY.md for sources and coverage.
Requires pypinyin==0.55.0, shapely==2.1.2 and opencc-python-reimplemented==0.1.7 at build time only.
"""
import argparse, hashlib, json, re, unicodedata
from pathlib import Path
from collections import defaultdict
from pypinyin import lazy_pinyin
from opencc import OpenCC
from shapely.geometry import shape, mapping

p = argparse.ArgumentParser()
p.add_argument('--names', required=True); p.add_argument('--towns', required=True)
p.add_argument('--cities', required=True); p.add_argument('--districts', required=True)
a = p.parse_args()
expected = {'names':'83b7536f853ad16beb4d37b92890a3fd7bb9d33d4f37e7c8885fb948749a9bc4',
 'towns':'250f63cdef76679b67d2a34633a69355c8f1180ae6b55407e6c87789940feab0',
 'cities':'12af10d8810b00d7258df7cc6cafa70023a3db41fc48e9f69846f6cfa543ac0b',
 'districts':'ea64fe24f193e319ce48895f229a5b3f46d2a60f3f3df67e6172ab037e4cc8fd'}
inputs = {}
for name, sha in expected.items():
 b = Path(getattr(a,name)).read_bytes()
 if hashlib.sha256(b).hexdigest()!=sha: raise ValueError('Source checksum mismatch: '+name)
 inputs[name]=json.loads(b)
root=Path(__file__).resolve().parent.parent; out=root/'public'
def write(path,data): path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
regions=[]
convert=OpenCC('t2s')
for r in inputs['names']:
 cities=[]; municipal=r['code'] in ['11','12','31','50']
 for c in r['children']:
  children=[dict(d,kind='statistical' if 71<=int(d['code'][-2:])<=80 else 'county') for d in c['children'] if len(d['code'])==6]
  if municipal:
   if not cities:cities.append({'code':r['code']+'00','name':r['name'],'kind':'municipality','districts':[]})
   cities[0]['districts']+=children
  elif c['name'] in ['省直辖县级行政区划','自治区直辖县级行政区划']:
   cities += [{'code':d['code'],'name':d['name'],'kind':'direct','districts':[]} for d in children]
  else:cities.append({'code':c['code'],'name':c['name'],'kind':'city','districts':children})
 regions.append({'code':r['code'],'name':r['name'],'cities':cities})
# Taiwan: names and geographic topology from the Ministry of the Interior mirror.
tw=inputs['towns']; by_city=defaultdict(list)
for g in tw['objects']['towns']['geometries']:
 v=g['properties'];by_city[(v['COUNTYCODE'],v['COUNTYNAME'])].append({'code':'tw:'+v['TOWNCODE'],'name':v['TOWNNAME'],'aliases':[convert.convert(v['TOWNNAME'])],'kind':'township'})
regions.append({'code':'71','name':'台湾省','cities':[{'code':'tw:'+code,'name':name,'aliases':[convert.convert(name)],'kind':'county-city','districts':sorted(ds,key=lambda d:d['code'])} for (code,name),ds in sorted(by_city.items())]})
# Public names only, transcribed from the linked official district directories.
hk=['中西区','湾仔区','东区','南区','油尖旺区','深水埗区','九龙城区','黄大仙区','观塘区','荃湾区','屯门区','元朗区','北区','大埔区','西贡区','沙田区','葵青区','离岛区']
mo=['花地玛堂区','花王堂区','望德堂区','大堂区','风顺堂区','嘉模堂区','圣方济各堂区','路氹填海区']
for code,name,city,ds in [('81','香港特别行政区','香港',hk),('82','澳门特别行政区','澳门',mo)]:
 regions.append({'code':code,'name':name,'cities':[{'code':code+'00','name':city,'kind':'special','districts':[{'code':code+str(i+1).zfill(4),'name':n,'aliases':[OpenCC('s2t').convert(n)],'kind':'district' if code=='81' else 'geographic'} for i,n in enumerate(ds)]}]})
directory={'version':1,'mainlandAsOf':'2023-06-30','taiwanSnapshot':'2021.9.20','regions':regions}
write(out/'china-admin.json',directory)

def norm(s): return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def cnkeys(s):
 base=re.sub('(市|地区|自治州|区|县|自治县|旗|自治旗|林区)$','',s)
 # A base transliteration is only a candidate; same-province/city geometry must agree.
 short=re.split('(?:藏族|羌族|彝族|回族|傣族|白族|哈尼族|苗族|土家族|蒙古族|布依族|壮族|朝鲜族|哈萨克|柯尔克孜|蒙古|侗族|傈僳族|拉祜族|佤族|水族|仡佬族|土族|撒拉族|毛南族|瑶族|黎族)',base)[0]
 keys={norm(''.join(lazy_pinyin(x))) for x in [s,base,short] if x}
 # Preserve polyphonic place pronunciation from the full administrative name.
 # 朝阳区 -> chao-yang, while the ordinary phrase 朝阳 can be zhao-yang.
 suffix=re.search('(市|地区|自治州|区|县|自治县|旗|自治旗|林区)$',s)
 if suffix:keys.add(norm(''.join(lazy_pinyin(s)[:-len(suffix[0])])))
 return keys
def enkey(s):return norm(re.sub(r'\b(?:Municipality|Autonomous|Prefecture|District|County|City|Province|Region|Tibetan|Qiang|Yi|Hui|Kazakh|Kyrgyz|Mongol|Miao|Tujia|Dai|Bai|Hani|Zhuang|Bouyei|Dong|Lisu|Korean)\b','',s,flags=re.I))
overrides={'Urumqi':'乌鲁木齐市','Karamay':'克拉玛依市','Kashgar':'喀什地区','Kizilsu':'克孜勒苏柯尔克孜自治州','Ili':'伊犁哈萨克自治州','Hotan':'和田地区','Altay':'阿勒泰地区','Hami':'哈密市','Turpan':'吐鲁番市','Bayin\'gholin':'巴音郭楞蒙古自治州','Bortala':'博尔塔拉蒙古自治州','Ngawa Tibetan and Qiang Autonomous Prefecture':'阿坝藏族羌族自治州','Garzê Tibetan Autonomous Prefecture':'甘孜藏族自治州','Hinggan':'兴安盟','Xilin Gol':'锡林郭勒盟','Alxa':'阿拉善盟','Ordos':'鄂尔多斯市','Tibet Autonomous Region':'西藏自治区'}
overrides.update({'Changzhi':'长治市','Lüliang':'吕梁市','Alxa League':'阿拉善盟','Bayannur':'巴彦淖尔市','Hinggan League':'兴安盟','Hohhot':'呼和浩特市','Hulunbuir':'呼伦贝尔市','Ulanqab':'乌兰察布市','Xilingol League':'锡林郭勒盟','Chaoyang':'朝阳市','Harbin':'哈尔滨市','Qiqihar':'齐齐哈尔市','Pingxiang':'萍乡市','Luohe':'漯河市','Enshi Tujia and Miao Autonomous Prefecture':'恩施土家族苗族自治州','Shennongjia Forestry District':'神农架林区','Xiangxi Tujia and Miao Autonomous Prefecture':'湘西土家族苗族自治州','Baisha Li Autonomous County':'白沙黎族自治县','Baoting Li and Miao Autonomous County':'保亭黎族苗族自治县','Changjiang Li Autonomous County':'昌江黎族自治县','Ledong Li Autonomous County':'乐东黎族自治县','Lingshui Li Autonomous County':'陵水黎族自治县','Qiongzhong Li and Miao Autonomous County':'琼中黎族苗族自治县','Qiandongnan Miao and Dong Autonomous Prefecture':'黔东南苗族侗族自治州','Qiannan Buyi and Miao Autonomous Prefecture':'黔南布依族苗族自治州','Qianxinan Buyi and Miao Autonomous Prefecture':'黔西南布依族苗族自治州','Dêqên Tibetan Autonomous Prefecture':'迪庆藏族自治州','Dehong Dai and Jingpo Autonomous Prefecture':'德宏傣族景颇族自治州','Honghe Hani and Yi Autonomous Prefecture':'红河哈尼族彝族自治州','Wenshan Zhuang and Miao Autonomous Prefecture':'文山壮族苗族自治州','Lhasa':'拉萨市','Lhoka':'山南市','Nagqu Prefecture':'那曲市','Ngari Prefecture':'阿里地区','Nyingchi':'林芝市','Qamdo':'昌都市','Xigazê':'日喀则市','Golog Tibetan Autonomous Prefecture':'果洛藏族自治州','Haixi Mongolian Autonomous Prefecture':'海西蒙古族藏族自治州','Ürümqi':'乌鲁木齐市','Aksu Prefecture':'阿克苏地区','Altay Prefecture':'阿勒泰地区','Bayingolin Mongolia Autonomous Prefecture':'巴音郭楞蒙古自治州','Bortala Mongol Autonomous Prefecture':'博尔塔拉蒙古自治州','Hotan Prefecture':'和田地区','Ili Kazak Autonomous Prefecture':'伊犁哈萨克自治州','Kizilsu Kirgiz Autonomous Prefecture':'克孜勒苏柯尔克孜自治州','Tarbaĝatay Prefecture':'塔城地区'})
province_features=json.loads((out/'china-simple.json').read_text())['features']
province_shapes={f['properties']['name']:shape(f['geometry']).buffer(0) for f in province_features}
city_lookup=defaultdict(list); district_lookup=defaultdict(list)
for r in regions[:31]:
 for c in r['cities']:
  for k in cnkeys(c['name']):city_lookup[k].append((r,c))
  for d in c['districts']:
   if d['kind']=='statistical':continue
   for k in cnkeys(d['name']):district_lookup[k].append((r,c,d))
def polygon_feature(code,name,province,city,geom,source,year,**extra):
 g=mapping(geom);coords=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 coords=[[[[round(x,4),round(y,4)] for x,y,*_ in ring] for ring in poly] for poly in coords]
 return {'type':'Feature','properties':{'id':int(code) if code.isdigit() else 100000000+int(code.split(':')[-1]),'code':'CN','adminCode':code,'name':name,'prefecture':province,'city':city,'source':source,'year':year,**extra},'geometry':{'type':'MultiPolygon','coordinates':coords}}
city_features=[];city_shapes={};unmatched_source_cities=[]
for f in inputs['cities']['features']:
 n=f['properties']['shapeName'];geom=shape(f['geometry']).buffer(0);pt=geom.representative_point()
 candidates=city_lookup[enkey(n)]
 if n in overrides:candidates=[(r,c) for r in regions[:31] for c in r['cities'] if c['name']==overrides[n]]
 candidates=[(r,c) for r,c in candidates if province_shapes[r['name']].covers(pt)]
 candidates=list({c['code']:(r,c) for r,c in candidates}.values())
 if len(candidates)!=1:unmatched_source_cities.append(n);continue
 r,c=candidates[0]
 if c['code'] in city_shapes:continue
 city_shapes[c['code']]=geom
 city_features.append(polygon_feature(c['code'],c['name'],r['name'],c['name'],geom,'geoBoundaries / HDX · CC BY 3.0 IGO',2020,sourceName=n))
# Direct-controlled municipalities reuse their documented province boundary.
for r in regions[:31]:
 for c in r['cities']:
  if c['kind']=='municipality' and c['code'] not in city_shapes:
   geom=province_shapes[r['name']];city_shapes[c['code']]=geom
   city_features.append(polygon_feature(c['code'],c['name'],r['name'],c['name'],geom,'geoBoundaries gbOpen ADM1 · Public Domain',2019))
# Province-direct county units have no fictional intervening prefecture.
for r in regions[:31]:
 for c in r['cities']:
  if c['kind']!='direct' or c['code'] in city_shapes:continue
  matches=[f for f in inputs['districts']['features'] if enkey(f['properties']['shapeName']) in cnkeys(c['name']) and province_shapes[r['name']].covers(shape(f['geometry']).representative_point())]
  if len(matches)==1:
   geom=shape(matches[0]['geometry']).buffer(0);city_shapes[c['code']]=geom
   city_features.append(polygon_feature(c['code'],c['name'],r['name'],c['name'],geom,'© OpenStreetMap / geoBoundaries · ODbL 1.0',2017))
district_features=[];unmatched_source_districts=[];seen=set()
for f in inputs['districts']['features']:
 n=f['properties']['shapeName'];geom=shape(f['geometry']).buffer(0);pt=geom.representative_point()
 candidates=[(r,c,d) for r,c,d in district_lookup[enkey(n)] if province_shapes[r['name']].covers(pt) and c['code'] in city_shapes and city_shapes[c['code']].covers(pt)]
 candidates=list({d['code']:(r,c,d) for r,c,d in candidates}.values())
 if len(candidates)!=1:unmatched_source_districts.append(n);continue
 r,c,d=candidates[0]
 if d['code'] in seen:continue
 seen.add(d['code']);district_features.append(polygon_feature(d['code'],d['name'],r['name'],c['name'],geom,'© OpenStreetMap / geoBoundaries · ODbL 1.0',2017,district=d['name'],sourceName=n))
# Decode the official non-projected TopoJSON using its delta transform.
arcs=[];transform=tw['transform']
for arc in tw['arcs']:
 x=y=0;points=[]
 for dx,dy in arc:
  x+=dx;y+=dy;points.append([x*transform['scale'][0]+transform['translate'][0],y*transform['scale'][1]+transform['translate'][1]])
 arcs.append(points)
def ring(ids):
 points=[]
 for i in ids:
  segment=arcs[i] if i>=0 else list(reversed(arcs[~i]));points+=segment if not points else segment[1:]
 return points
def decode(g):
 aa=g['arcs'] if g['type']=='MultiPolygon' else [g['arcs']]
 return shape({'type':'MultiPolygon','coordinates':[[ring(ids) for ids in poly] for poly in aa]}).buffer(0)
for g in tw['objects']['counties']['geometries']:
 v=g['properties'];city_features.append(polygon_feature('tw:'+v['COUNTYCODE'],v['COUNTYNAME'],'台湾省',v['COUNTYNAME'],decode(g),'内政部 / taiwan-atlas · Open Government Data License 1.0',2021))
for g in tw['objects']['towns']['geometries']:
 v=g['properties'];district_features.append(polygon_feature('tw:'+v['TOWNCODE'],v['TOWNNAME'],'台湾省',v['COUNTYNAME'],decode(g),'内政部 / taiwan-atlas · Open Government Data License 1.0',2021,district=v['TOWNNAME']))
for r in regions[-2:]:
 c=r['cities'][0];city_features.append(polygon_feature(c['code'],c['name'],r['name'],c['name'],province_shapes[r['name']],'geoBoundaries gbOpen ADM1 · Public Domain',2019))
write(out/'china-cities.json',{'type':'FeatureCollection','features':city_features})
shards=out/'china-districts';shards.mkdir(exist_ok=True)
coverage=[]
for r in regions:
 cf=[f for f in city_features if f['properties']['prefecture']==r['name']];df=[f for f in district_features if f['properties']['prefecture']==r['name']]
 write(shards/(r['code']+'.json'),{'type':'FeatureCollection','features':df})
 coverage.append({'code':r['code'],'name':r['name'],'directoryCities':len(r['cities']),'directoryDistricts':sum(len(c['districts']) for c in r['cities']),'mappedCities':len(cf),'mappedDistricts':len(df)})
write(out/'china-coverage.json',{'version':1,'regions':coverage,'unmatchedSourceCities':unmatched_source_cities,'unmatchedSourceDistricts':unmatched_source_districts,'missingCityCodes':[c['code'] for r in regions for c in r['cities'] if c['code'] not in {f['properties']['adminCode'] for f in city_features}],'missingDistrictCodes':[d['code'] for r in regions for c in r['cities'] for d in c['districts'] if d['code'] not in {f['properties']['adminCode'] for f in district_features}]})
print('directory:',len(regions),'regions,',sum(len(r['cities']) for r in regions),'cities / direct units,',sum(len(c['districts']) for r in regions for c in r['cities']),'district names')
print('audited historical geometry:',len(city_features),'city units,',len(district_features),'districts')
