import test from 'node:test';
import {readFileSync} from 'node:fs';
import {posterMapFrame} from '../lib/poster-composition.ts';
import {posterFormats} from '../lib/travel-poster.ts';
import assert from 'node:assert/strict';
import {buildPoster} from '../lib/travel-poster.ts';
import {posterPalette,presetColors} from '../lib/poster-style.ts';
import type {MapFeature} from '../lib/geography.ts';
const features:MapFeature[]=[{properties:{id:1,name:'合成地区'},geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[2,0],[2,2],[0,2],[0,0]]]]}}];
const options={scope:'sichuan' as const,features,visits:[{id:'synthetic',country:'CN',prefecture:'四川省',city:'合成地区',date:'2026-09-20',place:'不应导出的私人地点',note:'不应导出的私人笔记'}],title:'自定义山河',format:'print' as const};
test('artwork content controls can exclude date/count without losing attribution or geographic masking',()=>{
 const minimal=buildPoster({...options,showSummary:false,showDates:false});assert.ok(!minimal.includes('次到访'));assert.ok(!minimal.includes('2026-09-20'));assert.ok(minimal.includes('HDX'));assert.ok(minimal.includes('poster-map-frame'));
 const shown=buildPoster({...options,showSummary:true,showDates:true});assert.ok(shown.includes('1 次到访'));assert.ok(shown.includes('2026-09-20'));assert.ok(!shown.includes('私人地点'));assert.ok(!shown.includes('私人笔记'));
});
test('custom colors only accept complete hex values and text adapts to the background',()=>{
 const invalid=posterPalette('night',{background:'url(javascript:bad)',land:'\" onload=\"bad',accent:'red'});assert.deepEqual(invalid,posterPalette('night'));
 const custom=posterPalette('paper',{background:'#17242c',land:'#708090',accent:'#ccbbaa'});assert.equal(custom.paper,'#17242c');assert.equal(custom.ink,'#f1ead6');assert.equal(custom.visited,'#ccbbaa');
 for(const preset of ['sand','mist','ink'] as const){const svg=buildPoster({...options,colors:presetColors(preset)});assert.ok(svg.includes(presetColors(preset).background!));assert.ok(!svg.includes('NaN'))}
});
test('custom titles and captions remain escaped across every style and format, with typography independent of map panning',()=>{
 for(const style of ['paper','night','memories'] as const)for(const format of ['print','desktop','phone'] as const){
  const svg=buildPoster({...options,style,format,title:'山河<script>&漫游',subtitle:'题记<>&\"',titleFont:'sans',mapOffset:{x:.25,y:-.1}});
  assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));assert.ok(svg.includes('题记&lt;&gt;&amp;&quot;'));assert.ok(svg.includes('font-family="PingFang SC'));assert.ok(!svg.includes('rotate('));
 }
});

test('real Japan and Sichuan boundaries stay finite within all nine configurable artwork frames',()=>{
 for(const scope of ['japan','sichuan'] as const){
  const real=JSON.parse(readFileSync(new URL(scope==='japan'?'../public/japan-simple.json':'../public/sichuan-cities.json',import.meta.url),'utf8')).features;
  for(const style of ['paper','night','memories'] as const)for(const format of ['print','desktop','phone'] as const){
   const {width,height}=posterFormats[format],frame=posterMapFrame(width,height,scope,style);
   assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.width<=width&&frame.y+frame.height<=height);
   const svg=buildPoster({...options,scope,features:real,visits:[],style,format,title:'二十四个字的自定义标题测试长文字排列层次效果检查',subtitle:'自定义题记留白与统计日期不会随着地图拖动改变位置',showSummary:true,showDates:true,mapScale:1.6,mapOffset:{x:.5,y:-.5}});
   assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.ok(svg.includes('poster-map-frame'));assert.ok(svg.includes('width="'+width+'"'));
  }
 }
});
