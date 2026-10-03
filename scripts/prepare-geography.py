# Reproduce public overview assets from the source snapshots documented in docs/GEOGRAPHY.md.
import hashlib
import argparse
import json
from pathlib import Path
args_parser=argparse.ArgumentParser()
args_parser.add_argument('--china',required=True)
args_parser.add_argument('--world',required=True)
args=args_parser.parse_args()
output=Path(__file__).resolve().parent.parent / 'public'
for filename,expected in [(args.china,'3a00467a0db9b4136facb5f2f3d0edbfd96adb15651cfdf63991da9281030e85'),(args.world,'6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f')]:
    if hashlib.sha256(Path(filename).read_bytes()).hexdigest()!=expected: raise ValueError('Source snapshot checksum mismatch: '+filename)
names={'Hainan Province':'海南省','Taiwan Province':'台湾省','Guangxi Zhuang Autonomous Region':'广西壮族自治区','Fujian Province':'福建省','Yunnan Province':'云南省','Guizhou Province':'贵州省','Guangdong Province':'广东省','Hong Kong Special Administrative Region':'香港特别行政区','Macau Special Administrative Region':'澳门特别行政区','Hunan Province':'湖南省','Jiangxi Province':'江西省','Zhejiang Province':'浙江省','Sichuan Province':'四川省','Chongqing Municipality':'重庆市','Hubei Province':'湖北省','Anhui Province':'安徽省','Jiangsu Province':'江苏省','Shanghai Municipality':'上海市','Tibet Autonomous Region':'西藏自治区','Qinghai Province':'青海省','Gansu Province':'甘肃省','Shaanxi Province':'陕西省','Henan Province':'河南省','Shandong Province':'山东省','Xinjiang Uygur Autonomous Region':'新疆维吾尔自治区','Ningxia Hui Autonomous Region':'宁夏回族自治区','Shanxi Province':'山西省','Hebei Province':'河北省','Beijing Municipality':'北京市','Tianjin Municipality':'天津市','Inner Mongolia Autonomous Region':'内蒙古自治区','Liaoning Province':'辽宁省','Jilin Province':'吉林省','Heilongjiang Province':'黑龙江省'}
names.update({'Ningxia Ningxia Hui Autonomous Region':'宁夏回族自治区','Xinjiang Uyghur Autonomous Region':'新疆维吾尔自治区','Guangzhou Province':'广东省'})
def geometry(g):
    coords=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    return {'type':'MultiPolygon','coordinates':[[[[round(x,4),round(y,4)] for x,y,*_ in ring] for ring in poly] for poly in coords]}
c=json.load(open(args.china)); out=[]
for i,f in enumerate(c['features']):
    n=f['properties']['shapeName'];name=names.get(n)
    if not name: raise Exception('Missing translation '+n)
    out.append({'type':'Feature','properties':{'id':i+1,'name':name,'code':'CN'},'geometry':geometry(f['geometry'])})
(output / 'china-simple.json').write_text(json.dumps({'type':'FeatureCollection','features':out},ensure_ascii=False,separators=(',',':')))
w=json.load(open(args.world));out=[]
for i,f in enumerate(w['features']):
    p=f['properties'];code=p['ISO_A2_EH']
    if code=='-99':code=p['ADM0_A3']
    out.append({'type':'Feature','properties':{'id':i+1,'name':({'CN':'中国','TW':'台湾地区'}.get(code) or p['NAME_ZH'] or p['NAME']),'code':code,'continent':p['CONTINENT']},'geometry':geometry(f['geometry'])})
(output / 'world-simple.json').write_text(json.dumps({'type':'FeatureCollection','features':out},ensure_ascii=False,separators=(',',':')))
print('Geography:',len(c['features']),len(out))
