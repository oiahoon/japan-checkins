import test from 'node:test';
import assert from 'node:assert/strict';
import {boundMapOffset,dragMapOffset,posterMapFrame} from '../lib/poster-composition.ts';
import {buildPoster,posterFormats} from '../lib/travel-poster.ts';
import type {MapFeature} from '../lib/geography.ts';
const features:MapFeature[]=[{properties:{id:1,name:'合成地区'},geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[2,0],[2,2],[0,2],[0,0]]]]}}];
test('drag follows screen directions at every preview size and never produces invalid or unreachable offsets',()=>{
 assert.deepEqual(dragMapOffset({x:0,y:0},20,-30,200,300),{x:.1,y:-.1});
 assert.deepEqual(dragMapOffset({x:0,y:0},40,-60,400,600),{x:.1,y:-.1});
 assert.deepEqual(dragMapOffset({x:.4,y:-.4},999,-999,200,300),{x:.5,y:-.5});
 assert.deepEqual(dragMapOffset({x:.2,y:.3},20,20,0,0),{x:.2,y:.3});
 assert.deepEqual(boundMapOffset({x:NaN,y:Infinity}),{x:0,y:0});
});
test('exported position matches the preview frame in all styles and formats without translating copy',()=>{
 for(const style of ['paper','night','memories'] as const)for(const format of ['print','desktop','phone'] as const){
  const {width,height}=posterFormats[format],frame=posterMapFrame(width,height,'sichuan',style),opts={scope:'sichuan' as const,features,visits:[],title:'合成地图',style,format,mapScale:1.3};
  const original=buildPoster(opts),moved=buildPoster({...opts,mapOffset:{x:.2,y:-.1}});
  assert.ok(moved.includes(`id="poster-map-pan" transform="translate(${frame.width*.2},${frame.height*-.1})"`));
  const copy=/<text x="[^"]+" y="[^"]+" font-family="Songti[^>]+>合成地图<\/text>/;
  assert.equal(moved.match(copy)?.[0],original.match(copy)?.[0]);assert.ok(moved.includes('clip-path="url(#poster-map-frame)"'));
  assert.ok(!moved.includes('rotate('));assert.ok(!moved.includes('NaN'));
 }
});
