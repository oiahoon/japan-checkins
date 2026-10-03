import test from 'node:test';
import assert from 'node:assert/strict';
import {photoAreas,puzzleSVG,type PuzzleRegion} from '../lib/photo-puzzle.ts';
import {buildPoster} from '../lib/travel-poster.ts';
const feature:PuzzleRegion={properties:{id:1001,name:'合成市',prefecture:'合成県'},geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[2,0],[2,2],[0,2],[0,0]]]]}};
const visit={id:'synthetic-visit',prefecture:'合成県',city:'合成市',place:'test',date:'2026-01-01',note:'<手动笔记>'};
const photos=[{id:'synthetic-photo',checkin:visit.id,url:'data:image/jpeg;base64,c3ludGhldGlj'}];
test('drafts and unassociated photos never become puzzle history',()=>{assert.equal(photoAreas('japan',[feature],[visit],[{...photos[0],checkin:null}]).length,0);assert.equal(photoAreas('japan',[feature],[{...visit,city:'未知市'}],photos).length,0);});
test('single photo has one image clipped to actual feature; no pattern tiling',()=>{const s=puzzleSVG({scope:'japan',features:[feature],visits:[visit],photos,project:p=>p,prefix:'test'});assert.equal((s.match(/<image /g)||[]).length,1);assert.ok(s.includes('clip-path="url(#test-0)"'));assert.ok(!s.includes('<pattern'));assert.ok(!s.includes('手动笔记'));});
test('multiple photos have stable cubic pieces and optional escaped manual notes',()=>{const args={scope:'japan' as const,features:[feature],visits:[visit],photos:Array.from({length:7},(_,i)=>({...photos[0],id:'synthetic-'+i})),project:(p:number[])=>p,prefix:'test',notes:true};const s=puzzleSVG(args);assert.equal(s,puzzleSVG(args));assert.equal((s.match(/<image /g)||[]).length,7);assert.ok(s.includes(' C'));assert.ok(s.includes('&lt;手动笔记&gt;'));assert.ok(!s.includes('<手动笔记>'));});
test('export toggle embeds photos only when enabled and omits notes',()=>{const opts={scope:'japan' as const,features:[feature],puzzleFeatures:[feature],visits:[visit],photos,title:'合成地图',format:'print' as const};assert.ok(!buildPoster(opts).includes('<image '));const enabled=buildPoster({...opts,puzzle:true});assert.ok(enabled.includes('data:image/jpeg;base64,'));assert.ok(!enabled.includes('手动笔记'));});
test('per-photo notes override legacy album notes and an explicitly empty note stays empty',()=>{const a=photoAreas('japan',[feature],[visit],[{...photos[0],details:{note:'这一张的手填记录'}}]);assert.equal(a[0].photos[0].note,'这一张的手填记录');const b=photoAreas('japan',[feature],[visit],[{...photos[0],details:{note:''}}]);assert.equal(b[0].photos[0].note,'');});

test('poster transforms keep photos in geographic clips, copy outside the map frame, and bound invalid inputs',()=>{
 for(const style of ['paper','night','memories'] as const)for(const format of ['print','desktop','phone'] as const){
  const svg=buildPoster({scope:'japan',features:[{...feature,properties:{...feature.properties,name:'合成県'}}],puzzleFeatures:[feature],visits:[visit],photos,title:'合成地图',format,style,puzzle:true,mapScale:1.3,mapAngle:36});
  const mapStart=svg.indexOf('<g clip-path="url(#poster-map-frame)">'), mapEnd=svg.indexOf('</g></g>',mapStart), copy=svg.indexOf('>合成地图</text>');
  assert.ok(mapStart>0&&mapEnd>mapStart&&copy>mapEnd);
  assert.ok(svg.indexOf('<image ',mapStart)<mapEnd);
  assert.ok(svg.includes('clip-path="url(#poster-photo-0)"'));
  assert.ok(svg.includes('rotate(36,'));assert.ok(svg.includes('rotate(-36,'));
  assert.ok(!svg.includes('手动笔记'));
 }
 for(const [scale,angle,expected] of [[Infinity,NaN,'Map scale: 1; angle: 0'],[4,500,'Map scale: 1.6; angle: 180'],[-1,-500,'Map scale: 0.5; angle: -180']] as const){
  const svg=buildPoster({scope:'japan',features:[feature],visits:[],title:'合成地图',format:'print',mapScale:scale,mapAngle:angle});assert.ok(svg.includes(expected));assert.ok(!svg.includes('NaN'));assert.ok(!svg.includes('Infinity'));
 }
});
