import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {japanPrefectures,japanMunicipalities,japanShard,japanPrefectureForNode,puzzlePrefectures} from '../lib/japan-boundaries.ts';
import {createExplorerTree,searchExplorer,nodeForVisit,detailNodeAt,fitCamera} from '../lib/map-explorer.ts';
import type {MapFeature} from '../lib/geography.ts';
const load=(path:string):{features:MapFeature[]}=>JSON.parse(readFileSync(new URL('../public/'+path+'.json',import.meta.url),'utf8'));
test('47 generated shards reconstruct every source feature unchanged, with stable names and IDs',()=>{
 const original=load('japan-cities').features,parts=japanPrefectures.flatMap(p=>{const text=readFileSync(new URL('../public'+japanShard(p.name),import.meta.url),'utf8'),v=JSON.parse(text);assert.equal(Buffer.byteLength(text),p.bytes);assert.equal(v.features.length,p.count);assert.ok(v.features.every((f:{properties:{prefecture:string}})=>f.properties.prefecture===p.name));return v.features});
 assert.equal(japanPrefectures.length,47);assert.equal(parts.length,1751);assert.equal(japanMunicipalities.length,1751);assert.deepEqual(parts.sort((a,b)=>a.properties.id-b.properties.id),original.sort((a,b)=>a.properties.id-b.properties.id));
 assert.equal(japanShard('福岡県'),'/japan-cities/40.json');assert.equal(japanShard('../private'),undefined);assert.equal(japanPrefectureForNode('jp-pref:40'),'福岡県');assert.equal(japanPrefectureForNode('jp-city:'+parts.find(f=>f.properties.prefecture==='福岡県').properties.id),'福岡県');
});
test('city search and restore remain available before geometry, without inventing a boundary',()=>{
 const geos={japan:load('japan-simple').features,japanCities:[],world:load('world-simple').features,china:[],sichuan:[],chengdu:[]};const tree=createExplorerTree(geos);
 const city=searchExplorer(tree,'福岡市').find(n=>n.country==='JP'&&n.area==='福岡県')!;assert.ok(city);assert.equal(city.hasBoundary,false);assert.deepEqual(city.features,[]);
 const visit={id:'synthetic',country:'JP',prefecture:'福岡県',city:'福岡市',place:'合成地点',date:'2020-01-01'};assert.equal(nodeForVisit(tree,visit)?.id,city.id);
 const fit=fitCamera(tree.get('jp-pref:40')!,.8);assert.ok(!detailNodeAt(tree,'jp-pref:40',{...fit,span:fit.span/5},.8).id.startsWith('jp-city:'));
 const loaded=createExplorerTree({...geos,japanCities:load('japan-cities/40').features});assert.equal(loaded.get(city.id)?.hasBoundary,true);assert.ok(loaded.get(city.id)!.features.length);assert.ok(!loaded.get('jp-pref:13')!.children.some(id=>loaded.get(id)!.features.length));
});
test('national puzzle/export asks only for prefectures containing selected photos and located visits',()=>{
 const base={id:'a',country:'JP',prefecture:'福岡県',city:'福岡市',place:'合成地点',date:'2020-01-01'};
 const visits=[base,{...base,id:'b',prefecture:'熊本県'},{...base,id:'c',prefecture:'東京都'},{...base,id:'d',country:'CN',prefecture:'四川省'},{...base,id:'e',city:''}];
 assert.deepEqual(puzzlePrefectures(visits,[{checkin:'a'},{checkin:'b'},{checkin:'d'},{checkin:'e'}]),['熊本県','福岡県']);assert.deepEqual(puzzlePrefectures(visits,[{checkin:'a'},{checkin:'b'}],'福岡県'),['福岡県']);assert.deepEqual(puzzlePrefectures(visits,[]),[]);
});
