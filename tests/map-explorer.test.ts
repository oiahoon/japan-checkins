import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExplorerTree,explorerPath,fitCamera,projectEarth,unprojectEarth,zoomCamera,clampCamera,detailNodeAt,nodeForArea,nodeForVisit,visitInExplorerNode,hasExplorerHistory,searchExplorer} from '../lib/map-explorer.ts';
const load=(file:string)=>JSON.parse(readFileSync(new URL('../public/'+file+'.json',import.meta.url),'utf8')).features;
const tree=createExplorerTree({japan:load('japan-simple'),japanCities:load('japan-cities'),china:load('china-simple'),sichuan:load('sichuan-cities'),chengdu:load('chengdu-districts'),world:load('world-simple')});
test('hierarchy uses source boundaries with Japanese municipal and Chinese district paths',()=>{
 assert.equal(tree.get('japan')!.children.length,47);assert.equal(tree.get('china')!.children.length,34);assert.equal(tree.get('sichuan')!.children.length,21);assert.equal(tree.get('chengdu')!.children.length,20);
 const fukuoka=searchExplorer(tree,'福冈県')[0];assert.equal(fukuoka.name,'福岡県');assert.deepEqual(explorerPath(tree,fukuoka.id).map(n=>n.name),['世界','亚洲','日本','福岡県']);
 const city=[...tree.values()].find(n=>n.name==='福岡市')!;assert.equal(city.area,'福岡県');assert.equal(city.country,'JP');assert.equal(city.children.length,0);
 assert.ok(searchExplorer(tree,'宇美町').some(n=>n.area==='福岡県'));assert.equal(searchExplorer(tree,'糟屋郡').length,0);
 const district=searchExplorer(tree,'锦江区')[0];assert.deepEqual(explorerPath(tree,district.id).map(n=>n.name),['世界','亚洲','中国','四川省','成都市','锦江区']);
 assert.equal(nodeForArea(tree,'china','四川省')!.id,'sichuan');assert.equal(nodeForArea(tree,'world','日本')!.id,'japan');assert.equal(nodeForArea(tree,'sichuan','成都市')!.id,'chengdu');
});
test('wheel and pinch preserve their anchor; portrait fit and finite bounds remain valid',()=>{
 const camera={x:125,y:-36,span:8},anchor={x:.2,y:.8},aspect=1.8;
 const point=(c:typeof camera)=>[c.x+(anchor.x-.5)*c.span,c.y+(anchor.y-.5)*c.span*aspect];
 const next=zoomCamera(camera,.5,aspect,anchor);assert.ok(point(camera).every((p,i)=>Math.abs(p-point(next)[i])<1e-10));
 for(const ratio of [.5,1,2.2]){const c=fitCamera(tree.get('japan')!,ratio);assert.ok(Object.values(c).every(Number.isFinite));assert.ok(c.span>0);}
 for(const p of [[-170,-60],[0,0],[150,65]]){const back=unprojectEarth(projectEarth(p));assert.ok(Math.abs(back[0]-p[0])<1e-8&&Math.abs(back[1]-p[1])<1e-8);}
 assert.deepEqual(clampCamera({x:999,y:-999,span:-5}),{x:180,y:-139.59,span:.018});
});
test('semantic entry and exit have hysteresis and never mutate the camera',()=>{
 const district=searchExplorer(tree,'锦江区')[0],fit=fitCamera(district,.7),before=JSON.stringify(fit);
 assert.equal(detailNodeAt(tree,district.id,{...fit,span:fit.span*1.4},.7).id,district.id);
 assert.notEqual(detailNodeAt(tree,district.id,{...fit,span:fit.span*1.7},.7).id,district.id);
 assert.equal(detailNodeAt(tree,'chengdu',{...fit,span:fit.span*.8},.7).id,district.id);
 assert.equal(detailNodeAt(tree,'chengdu',{...fit,span:fit.span*1.1},.7).id,'chengdu');
 assert.equal(JSON.stringify(fit),before);
 assert.equal(detailNodeAt(tree,'japan',{...fitCamera(tree.get('japan')!,.7),span:fitCamera(tree.get('asia')!,.7).span*1.2},.7).id,'asia');
 assert.equal(detailNodeAt(tree,'japan',{...fitCamera(tree.get('japan')!,.7),span:430},.7).id,'world');
});
test('country, province, city and district contexts isolate saved records without guessing visits',()=>{
 const a={id:'synthetic-jp',country:'JP',prefecture:'福岡県',city:'福岡市',date:'2020-01-01',place:'合成地点'},b={...a,id:'synthetic-cn',country:'CN',prefecture:'四川省',city:'成都市',district:'锦江区'};
 assert.equal(nodeForVisit(tree,a)!.name,'福岡市');assert.equal(nodeForVisit(tree,b)!.name,'锦江区');
 assert.equal(hasExplorerHistory(nodeForVisit(tree,a)!,'japan',new Set(['福岡県'])),false);assert.equal(hasExplorerHistory(tree.get('jp-pref:40')!,'japan',new Set(['福岡県'])),true);
 assert.equal(visitInExplorerNode(a,tree.get('china')!),false);assert.equal(visitInExplorerNode(b,tree.get('japan')!),false);
 assert.equal(visitInExplorerNode(b,tree.get('sichuan')!),true);assert.equal(visitInExplorerNode({...b,city:'绵阳市'},tree.get('chengdu')!),false);
 assert.equal(visitInExplorerNode({...b,district:undefined},searchExplorer(tree,'锦江区')[0]),false);
 assert.equal(visitInExplorerNode({...a,city:'鹿児島市'},nodeForVisit(tree,a)!),false);
 assert.equal(visitInExplorerNode(a,tree.get('asia')!),true);
 assert.equal(visitInExplorerNode({...a,country:'US'},tree.get('asia')!),false);
 assert.equal(visitInExplorerNode({...a,latitude:40,longitude:-100},tree.get('asia')!),false);
 assert.equal(explorerPath(tree,'country:KR').at(-2)?.id,'asia');
 assert.equal(nodeForVisit(tree,{...a,prefecture:'北海道',city:'泊村'})!.name,'北海道');
});

test('municipal focus centers the main polygon while preserving remote-island geometry',()=>{
 const city=searchExplorer(tree,'福岡市')[0],camera=fitCamera(city,1.8),[lon,lat]=unprojectEarth([camera.x,camera.y]);
 assert.ok(lon>130.2&&lon<130.6&&lat>33.3&&lat<33.8);assert.ok(city.features[0].geometry.coordinates.length>1);
 assert.deepEqual(explorerPath(tree,city.id).map(n=>n.name),['世界','亚洲','日本','福岡県','福岡市']);
});
