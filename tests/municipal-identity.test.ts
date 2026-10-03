import test from 'node:test';
import assert from 'node:assert/strict';
import {photoAreas,type PuzzleRegion} from '../lib/photo-puzzle.ts';
import {createExplorerTree,nodeForVisit,visitInExplorerNode} from '../lib/map-explorer.ts';
const feature=(id:number,x:number):PuzzleRegion=>({properties:{id,name:'合成同名村',prefecture:'合成県'},geometry:{coordinates:[[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]]]]}});
test('same-name municipalities require a confirmed coordinate instead of choosing the first polygon',()=>{
 const fs=[feature(101,1),feature(102,3)],visit={id:'synthetic-visit',country:'JP',prefecture:'合成県',city:'合成同名村',date:'2020-01-01',place:'合成地点'},photos=[{id:'synthetic-photo',checkin:visit.id,url:'data:image/jpeg;base64,synthetic'}];
 assert.equal(photoAreas('japan',fs,[visit],photos).length,0);
 assert.equal(photoAreas('japan',fs,[{...visit,latitude:.5,longitude:3.5}],photos)[0].feature.properties.id,102);
 assert.equal(photoAreas('japan',fs,[{...visit,latitude:null,longitude:null}],photos).length,0);
 const tree=createExplorerTree({japan:[{...feature(1,1),properties:{id:1,name:'合成県'}}],japanCities:fs,china:[],world:[]});
 assert.equal(visitInExplorerNode(visit,tree.get('jp-city:101')!),false);assert.equal(visitInExplorerNode(visit,tree.get('jp-city:102')!),false);assert.equal(visitInExplorerNode({...visit,latitude:.5,longitude:3.5},tree.get('jp-city:102')!),true);assert.equal(visitInExplorerNode({...visit,latitude:.5,longitude:3.5},tree.get('jp-city:101')!),false);
 assert.equal(nodeForVisit(tree,visit)!.id,'jp-pref:1');assert.equal(nodeForVisit(tree,{...visit,latitude:.5,longitude:3.5})!.id,'jp-city:102');
});
