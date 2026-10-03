"""Reproduce Sichuan city boundaries and Xisha physical-island supplement.
Sources and licenses: docs/GEOGRAPHY.md. Source files stay outside Git.
"""
import argparse, hashlib, json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--prefectures',required=True);p.add_argument('--islands',required=True);a=p.parse_args()
for path,sha in [(a.prefectures,'12af10d8810b00d7258df7cc6cafa70023a3db41fc48e9f69846f6cfa543ac0b'),(a.islands,'1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416')]:
    if hashlib.sha256(Path(path).read_bytes()).hexdigest()!=sha:raise ValueError('Source checksum mismatch')
names={'Chengdu':'成都市','Zigong':'自贡市','Panzhihua':'攀枝花市','Luzhou':'泸州市','Deyang':'德阳市','Mianyang':'绵阳市','Guangyuan':'广元市','Suining':'遂宁市','Neijiang':'内江市','Leshan':'乐山市','Nanchong':'南充市','Meishan':'眉山市','Yibin':'宜宾市',"Guang'an":'广安市','Dazhou':'达州市',"Ya'an":'雅安市','Bazhong':'巴中市','Ziyang':'资阳市','Ngawa Tibetan and Qiang Autonomous Prefecture':'阿坝藏族羌族自治州','Garzê Tibetan Autonomous Prefecture':'甘孜藏族自治州','Liangshan Yi Autonomous Prefecture':'凉山彝族自治州'}
def polygons(g):return g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
def rounded(polys):return [[[[round(x,5),round(y,5)] for x,y,*_ in ring] for ring in poly] for poly in polys]
features=[]
for f in json.load(open(a.prefectures))['features']:
    n=f['properties']['shapeName']
    if n in names:features.append({'type':'Feature','properties':{'id':len(features)+1,'name':names[n],'code':'CN'},'geometry':{'type':'MultiPolygon','coordinates':rounded(polygons(f['geometry']))}})
assert len(features)==21
out=Path(__file__).resolve().parent.parent/'public'
(out/'sichuan-cities.json').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
# Retain physical island polygons, not maritime boundaries or invented visit dots.
islands=[]
for f in json.load(open(a.islands))['features']:
    for poly in polygons(f['geometry']):
        pts=[pt for ring in poly for pt in ring]
        if all(110<pt[0]<114 and 15<pt[1]<18 for pt in pts):islands.append(poly)
assert len(islands)==18
china=json.load(open(out/'china-simple.json'));hainan=next(f for f in china['features'] if f['properties']['name']=='海南省')
hainan['geometry']['coordinates']=[poly for poly in hainan['geometry']['coordinates'] if any(pt[1]>=18 for r in poly for pt in r)]+rounded(islands)
(out/'china-simple.json').write_text(json.dumps(china,ensure_ascii=False,separators=(',',':')))
print('21 Sichuan prefectures; 18 Xisha physical island polygons')
