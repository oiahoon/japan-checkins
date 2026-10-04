import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExplorerTree,explorerPath,searchExplorer,type ExplorerNode} from '../lib/map-explorer.ts';
import {posterRegions,posterVisitArea,posterPhotoAreas,posterPuzzleRegion,posterRegionProjection} from '../lib/poster-region.ts';
import {buildPoster} from '../lib/travel-poster.ts';
import type {GeographicVisit,MapFeature} from '../lib/geography.ts';
const load=(file:string)=>JSON.parse(readFileSync(new URL('../public/'+file+'.json',import.meta.url),'utf8'));
const tree=createExplorerTree({japan:load('japan-simple').features,japanCities:load('japan-cities').features,china:load('china-simple').features,sichuan:load('sichuan-cities').features,chengdu:load('chengdu-districts').features,world:load('world-simple').features,chinaAdmin:load('china-admin'),chinaCities:load('china-cities').features,chinaDistricts:load('china-districts/44').features});
const jp:GeographicVisit&{note:string}={id:'synthetic-jp',country:'JP',prefecture:'福岡県',city:'福岡市',date:'2020-01-01',place:'合成地点',note:'不应导出的笔记'};
const cn:GeographicVisit={...jp,id:'synthetic-cn',country:'CN',prefecture:'四川省',city:'成都市',district:'锦江区'};
const region=(node:ExplorerNode)=>posterRegions(explorerPath(tree,node.id)).at(-1)!;
const city=searchExplorer(tree,'福岡市')[0],district=searchExplorer(tree,'锦江区')[0];
test('export inherits world, country, province, municipality and district navigation',()=>{
 const regions=posterRegions(explorerPath(tree,city.id));assert.deepEqual(regions.map(r=>r.name),['世界','亚洲','日本','福岡県','福岡市']);assert.equal(regions.at(-1)!.features.length,1);
 assert.deepEqual(posterRegions(explorerPath(tree,district.id)).map(r=>r.name),['世界','亚洲','中国','四川省','成都市','锦江区']);
 assert.equal(region(city).unit,'个市区町村');assert.equal(region(district).unit,'个区县');
 assert.equal(posterVisitArea(jp,region(city)),'福岡市');assert.equal(posterVisitArea(cn,region(city)),'');assert.equal(posterVisitArea(cn,region(district)),'锦江区');assert.equal(posterVisitArea({...cn,district:undefined},region(district)),'');
 assert.equal(posterVisitArea({...jp,country:'US'},region(tree.get('country:US')!)),'美国');
});
test('China shards retain district-level eligibility and source license',()=>{
 const node=searchExplorer(tree,'福田区').find(n=>n.district==='福田区')!;assert.ok(node.features.length);
 const r=region(node);assert.equal(r.name,'福田区');assert.ok(r.license.includes('ODbL'));assert.ok(r.attribution.includes('2017'));
 const v={...cn,prefecture:'广东省',city:'深圳市',district:'福田区'};assert.equal(posterVisitArea(v,r),'福田区');assert.equal(posterVisitArea({...v,district:'南山区'},r),'');
 assert.equal(region(tree.get('sichuan')!).license.includes('by/3.0/igo'),true);
});
test('missing independent geometry falls back to nearest supported ancestor explicitly',()=>{
 const parent=tree.get('chengdu')!,missing:ExplorerNode={...parent,id:'synthetic-unmapped',name:'合成缺失区',parent:parent.id,features:[],hasBoundary:false,district:'合成缺失区'};
 const path=[...explorerPath(tree,parent.id),missing],rs=posterRegions(path);assert.equal(rs.at(-1)!.node.id,parent.id);assert.equal(rs.at(-1)!.fallbackFrom,'合成缺失区');assert.ok(!rs.some(r=>r.node.id===missing.id));
});
test('photo clips use current region and confirmed visit associations only',()=>{
 const photos=[{id:'a',checkin:jp.id,url:'data:image/png;base64,AA=='},{id:'b',checkin:cn.id,url:'data:image/png;base64,BB=='},{id:'draft',checkin:null,url:'data:image/png;base64,CC=='}];
 const groups=posterPhotoAreas(region(city),[jp,cn],photos);assert.equal(groups.length,1);assert.equal(groups[0].feature.properties.name,'福岡市');assert.deepEqual(groups[0].photos.map(p=>p.id),['a']);assert.equal(groups[0].photos[0].note,'');
 const r=posterPuzzleRegion(region(tree.get('japan')!),load('japan-cities').features);assert.equal(posterPhotoAreas(r,[{...jp,city:''}],photos).length,0);
 const sameName={...jp,prefecture:'北海道',city:'泊村'};assert.equal(posterVisitArea(sameName,region(searchExplorer(tree,'北海道')[0])),'');
 assert.equal(posterPhotoAreas(region(searchExplorer(tree,'北海道')[0]),[sameName],[{...photos[0],checkin:sameName.id}]).length,0);
});
test('Asia frame clips geographic extent; outside visits do not enter artwork counts',()=>{
 const r=region(tree.get('asia')!),project=posterRegionProjection(r,r.features,1000,1000,20);assert.ok(project([35,65]).every(Number.isFinite));
 const svg=buildPoster({region:r,scope:'world',features:[],visits:[jp,{...cn,country:'US'}],title:'亚洲',format:'print',showSummary:true});assert.ok(svg.includes('1 次到访'));assert.ok(svg.includes('poster-geography-frame'));assert.ok(svg.includes('ASIA'));
});
test('regional artwork remains deterministic and isolated across every style and format',()=>{
 for(const node of [tree.get('world')!,tree.get('asia')!,tree.get('japan')!,city,tree.get('sichuan')!,district])for(const style of ['paper','night','memories'] as const)for(const format of ['print','desktop','phone'] as const){
  const r=region(node),opts={region:r,scope:r.scope,features:r.features,visits:[jp,cn],title:r.name+'<>&',format,style,labels:true,precise:true,mapScale:1.3,mapOffset:{x:.2,y:-.1},showSummary:true};const svg=buildPoster(opts);
  assert.equal(svg,buildPoster(opts));assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.ok(svg.includes('&lt;&gt;&amp;'));assert.ok(!svg.includes(jp.note!));assert.ok(!svg.includes('rotate('));assert.ok(svg.includes('poster-map-frame'));
  if(node===city)assert.ok(svg.includes('1 次到访 · 1 个市区町村'));
 }
});
test('national China retains Xisha inset; local island points are not suppressed',()=>{
 const national=region(tree.get('china')!),hainan=region(searchExplorer(tree,'海南省')[0]);
 const opts={scope:'china' as const,features:national.features,visits:[],title:'合成',format:'print' as const};assert.ok(buildPoster({...opts,region:national}).includes('西沙群岛</text>'));assert.ok(!buildPoster({...opts,region:hainan}).includes('局部放大 · 非同比例'));
 // Synthetic geometry checks the point suppression contract without storing personal EXIF.
 const f:MapFeature={properties:{id:1,name:'合成岛'},geometry:{coordinates:[[[[110,15],[113,15],[113,18],[110,18],[110,15]]]]}};
 const n:ExplorerNode={id:'synthetic-island',name:'合成岛',parent:'china',scope:'china',area:'合成岛',country:'CN',features:[f],children:[]};const r=posterRegions([n])[0];const v={...cn,prefecture:'合成岛',latitude:16,longitude:112};
 assert.ok(buildPoster({...opts,region:r,visits:[v],precise:true}).includes('<circle cx='));
});
test('same-name municipality highlights and counts stay keyed by source identity',()=>{
 const f=(id:number,l:number):MapFeature=>({properties:{id,name:'合成同名村',prefecture:'合成県'},geometry:{coordinates:[[[[l,0],[l+1,0],[l+1,1],[l,1],[l,0]]]]}});
 const n:ExplorerNode={id:'synthetic-pref',name:'合成県',parent:'japan',scope:'japan',country:'JP',area:'合成県',features:[f(1,0),f(2,2)],children:[]};const r=posterRegions([n])[0];
 const a={...jp,prefecture:'合成県',city:'合成同名村',latitude:.5,longitude:.5},b={...a,id:'synthetic-other',longitude:2.5};
 const opts={region:r,scope:r.scope,features:r.features,visits:[a],title:'合成县',format:'print' as const,showSummary:true};
 const one=buildPoster(opts),two=buildPoster({...opts,visits:[a,b]});assert.ok(one.includes('1 次到访 · 1 个市区町村'));assert.ok(two.includes('2 次到访 · 2 个市区町村'));
 const fills=[...one.matchAll(/<path d="[^"]+" fill="([^"]+)"/g)].map(m=>m[1]);assert.equal(fills.length,2);assert.notEqual(fills[0],fills[1]);
 const svg=buildPoster({...opts,puzzle:true,photos:[{id:'a',checkin:a.id,url:'data:image/png;base64,AA=='},{id:'b',checkin:'foreign',url:'data:image/png;base64,BB=='}]});assert.ok(svg.includes('data:image/png;base64,AA=='));assert.ok(!svg.includes('data:image/png;base64,BB=='));assert.ok(svg.includes('clip-path='));
});
