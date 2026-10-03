import {countryOf,bounds,type Scope,type MapFeature,type Geographies,type GeographicVisit} from './geography.ts';
import {prefectureAt} from './photo-metadata.ts';
import type {PuzzleRegion} from './photo-puzzle.ts';

export type ExplorerGeographies=Geographies&{japanCities:PuzzleRegion[]};
export type MapCamera={x:number;y:number;span:number};
export type ExplorerNode={id:string;name:string;parent:string|null;scope:Scope;area:string;country?:string;city?:string;ambiguousCity?:boolean;district?:string;features:MapFeature[];children:string[];frame?:[number,number,number,number];focusFrame?:[number,number,number,number]};
export type ExplorerTree=Map<string,ExplorerNode>;
export const projectEarth=([lon,lat]:number[])=>[lon,-Math.log(Math.tan(Math.PI/4+Math.max(-80,Math.min(80,lat))*Math.PI/360))*180/Math.PI];
export const unprojectEarth=([x,y]:number[])=>[x,(2*Math.atan(Math.exp(-y*Math.PI/180))-Math.PI/2)*180/Math.PI];

// Keep a municipality's largest connected landmass central; remote islands remain in source geometry.
function municipalFocus(feature:MapFeature):[number,number,number,number]{
 const area=(polygon:number[][][])=>Math.abs(polygon[0].reduce((sum,p,i,ring)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0));
 const polygon=feature.geometry.coordinates.reduce((largest,next)=>area(next)>area(largest)?next:largest);
 return bounds([{...feature,geometry:{coordinates:[polygon]}}]);
}

export function createExplorerTree(g:ExplorerGeographies):ExplorerTree{
 const tree:ExplorerTree=new Map();
 const add=(node:ExplorerNode)=>{tree.set(node.id,node);return node;};
 add({id:'world',name:'世界',parent:null,scope:'world',area:'',features:g.world,children:[],frame:[-180,-60,180,78]});
 // Asia is a viewing frame, not a new administrative boundary or a country classification.
 add({id:'asia',name:'亚洲',parent:'world',scope:'world',area:'',features:g.world,children:[],frame:[35,-12,155,65]});
 for(const f of g.world){const code=f.properties.code||String(f.properties.id),id=code==='JP'?'japan':code==='CN'?'china':'country:'+code;
  add({id,name:f.properties.name,parent:f.properties.continent==='Asia'||code==='JP'||code==='CN'?'asia':'world',scope:code==='JP'?'japan':code==='CN'?'china':'world',area:'',country:code,features:code==='JP'?g.japan:code==='CN'?g.china:[f],children:[]});
  tree.get('world')!.children.push(id);tree.get('asia')!.children.push(id);
 }
 // The retained Sites adapter can still use Japanese geography without a world dataset.
 if(!tree.has('japan'))add({id:'japan',name:'日本',parent:'asia',scope:'japan',area:'',country:'JP',features:g.japan,children:[]});
 if(!tree.has('china'))add({id:'china',name:'中国',parent:'asia',scope:'china',area:'',country:'CN',features:g.china,children:[]});
 for(const f of g.japan){const id='jp-pref:'+f.properties.id,cities=g.japanCities.filter(c=>c.properties.prefecture===f.properties.name);
  add({id,name:f.properties.name,parent:'japan',scope:'japan',area:f.properties.name,country:'JP',features:cities.length?cities:[f],children:[],frame:bounds([f])});tree.get('japan')!.children.push(id);
  for(const c of cities){const cid='jp-city:'+c.properties.id;add({id:cid,name:c.properties.name,parent:id,scope:'japan',area:f.properties.name,country:'JP',city:c.properties.name,focusFrame:municipalFocus(c),ambiguousCity:cities.filter(other=>other.properties.name===c.properties.name).length>1,features:[c],children:[]});tree.get(id)!.children.push(cid);}
 }
 for(const f of g.china){const id=f.properties.name==='四川省'?'sichuan':'cn-pref:'+f.properties.id;
  add({id,name:f.properties.name,parent:'china',scope:id==='sichuan'?'sichuan':'china',area:id==='sichuan'?'':f.properties.name,country:'CN',features:id==='sichuan'&&g.sichuan?.length?g.sichuan:[f],children:[],frame:bounds([f])});tree.get('china')!.children.push(id);
 }
 for(const f of g.sichuan||[]){const id=f.properties.name==='成都市'?'chengdu':'sc-city:'+f.properties.id;
  add({id,name:f.properties.name,parent:'sichuan',scope:id==='chengdu'?'chengdu':'sichuan',area:id==='chengdu'?'':f.properties.name,country:'CN',city:f.properties.name,features:id==='chengdu'&&g.chengdu?.length?g.chengdu:[f],children:[],frame:bounds([f])});tree.get('sichuan')?.children.push(id);
 }
 for(const f of g.chengdu||[]){const id='cd-district:'+f.properties.id;add({id,name:f.properties.name,parent:'chengdu',scope:'chengdu',area:f.properties.name,country:'CN',city:'成都市',district:f.properties.name,features:[f],children:[]});tree.get('chengdu')?.children.push(id);}
 return tree;
}

export function nodeBounds(node:ExplorerNode):[number,number,number,number]{
 const [l,b,r,t]=node.frame||bounds(node.features),[x,y]=projectEarth([l,t]),[right,bottom]=projectEarth([r,b]);return [x,y,right,bottom];
}
export function fitCamera(node:ExplorerNode,aspect:number,padding=1.18):MapCamera{
 const [l,t,r,b]=nodeBounds(node.focusFrame?{...node,frame:node.focusFrame}:node);return {x:(l+r)/2,y:(t+b)/2,span:Math.max(.018,Math.max(r-l,(b-t)/Math.max(.3,aspect))*padding)};
}
export function clampCamera(camera:MapCamera):MapCamera{
 return {x:Math.max(-180,Math.min(180,camera.x)),y:Math.max(-139.59,Math.min(139.59,camera.y)),span:Math.max(.018,Math.min(430,camera.span))};
}
// Keep the geographic point under the wheel/pinch anchor stable. Coordinates are fractions of the viewport.
export function zoomCamera(c:MapCamera,factor:number,aspect:number,anchor={x:.5,y:.5}):MapCamera{
 const span=clampCamera({...c,span:c.span*factor}).span;return clampCamera({x:c.x+(anchor.x-.5)*(c.span-span),y:c.y+(anchor.y-.5)*(c.span-span)*aspect,span});
}
export function explorerPath(tree:ExplorerTree,id:string):ExplorerNode[]{
 const path:ExplorerNode[]=[],seen=new Set<string>();let n=tree.get(id);while(n&&!seen.has(n.id)){seen.add(n.id);path.unshift(n);n=n.parent?tree.get(n.parent):undefined;}return path;
}
export function nodeForArea(tree:ExplorerTree,scope:Scope,area=''){
 if(!area)return tree.get(scope==='world'?'world':scope);
 if(scope==='world')return [...tree.values()].find(n=>n.parent&&(n.parent==='world'||n.parent==='asia')&&n.name===area)||tree.get('world');
 if(scope==='china'&&area==='四川省')return tree.get('sichuan');
 if(scope==='sichuan'&&area==='成都市')return tree.get('chengdu');
 return [...tree.values()].find(n=>n.scope===scope&&n.area===area&&!n.city&&!n.district)
  ||[...tree.values()].find(n=>n.scope===scope&&(n.area===area||n.name===area))||tree.get(scope);
}
export function nodeForVisit(tree:ExplorerTree,v:GeographicVisit){
 const code=countryOf(v);
 if(code==='JP'){
  const matches=[...tree.values()].filter(n=>n.country==='JP'&&n.area===v.prefecture&&n.city===v.city);
  const city=matches.length===1?matches[0]:v.latitude!=null&&v.longitude!=null?matches.find(n=>prefectureAt(v.latitude!,v.longitude!,n.features)):undefined;
  return city||nodeForArea(tree,'japan',v.prefecture)||tree.get('japan');
 }
 if(code==='CN'&&v.prefecture==='四川省')return [...tree.values()].find(n=>n.district&&n.district===v.district&&v.city==='成都市')
  ||[...tree.values()].find(n=>n.country==='CN'&&n.city===v.city&&!n.district)||tree.get('sichuan');
 if(code==='CN')return nodeForArea(tree,'china',v.prefecture)||tree.get('china');
 return tree.get('country:'+code)||tree.get('world');
}
export function visitInExplorerNode(v:GeographicVisit,node:ExplorerNode):boolean{
 if(node.id==='world')return true;
 if(node.id==='asia'){
  const [l,b,r,t]=node.frame!;
  if(v.latitude!=null&&v.longitude!=null)return v.longitude>=l&&v.longitude<=r&&v.latitude>=b&&v.latitude<=t;
  const f=node.features.find(f=>f.properties.code===countryOf(v));
  return f?.properties.continent==='Asia';
 }
 if(node.country&&countryOf(v)!==node.country)return false;
 if(node.id==='sichuan'||node.scope==='sichuan'||node.scope==='chengdu'){if(v.prefecture!=='四川省')return false;}
 if(node.scope==='japan'&&node.area&&v.prefecture!==node.area)return false;
 if(node.scope==='china'&&node.area&&v.prefecture!==node.area)return false;
 if(node.ambiguousCity)return Boolean(v.latitude!=null&&v.longitude!=null&&prefectureAt(v.latitude,v.longitude,node.features));
 if(node.city&&v.city!==node.city){
  if(node.country!=='JP'||v.latitude==null||v.longitude==null||!prefectureAt(v.latitude,v.longitude,node.features))return false;
 }
 if(node.district&&v.district!==node.district)return Boolean(v.latitude!=null&&v.longitude!=null&&prefectureAt(v.latitude,v.longitude,node.features));
 return true;
}
export function detailNodeAt(tree:ExplorerTree,currentId:string,camera:MapCamera,aspect:number):ExplorerNode{
 let node=tree.get(currentId)||tree.get('world')!;
 // Exit and entry bands differ. Changing a layer never changes the camera.
 for(let i=0;i<8;i++){
  const fitted=fitCamera(node,aspect),[l,t,r,b]=nodeBounds(node),off=camera.x<l||camera.x>r||camera.y<t||camera.y>b;
  if(node.parent&&(camera.span>fitted.span*1.6||(off&&camera.span<fitted.span*.8))){node=tree.get(node.parent)!;continue;}break;
 }
 if(node.id==='world'&&camera.x>=35&&camera.x<=155&&camera.y>=projectEarth([0,65])[1]&&camera.y<=projectEarth([0,-12])[1]&&camera.span<fitCamera(tree.get('asia')!,aspect).span*.78)node=tree.get('asia')!;
 for(let i=0;i<5;i++){
  const probes=[[camera.x,camera.y],[camera.x-camera.span*.2,camera.y],[camera.x+camera.span*.2,camera.y],[camera.x,camera.y-camera.span*aspect*.2],[camera.x,camera.y+camera.span*aspect*.2]].map(unprojectEarth);
  const next=node.children.map(id=>tree.get(id)!).filter(Boolean).filter(n=>{
   const [l,t,r,b]=nodeBounds(n);return camera.x>=l&&camera.x<=r&&camera.y>=t&&camera.y<=b&&camera.span<fitCamera(n,aspect).span*.88;
  }).find(n=>probes.some(([lon,lat])=>Boolean(prefectureAt(lat,lon,n.features))));
  if(!next)break;node=next;
 }
 return node;
}
const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/冈/g,'岡').replace(/县/g,'県').replace(/儿/g,'児').replace(/\s/g,'');
export function searchExplorer(tree:ExplorerTree,query:string):ExplorerNode[]{
 const q=normalize(query.trim());if(!q)return ['japan','china','sichuan','chengdu','asia','world'].map(id=>tree.get(id)!).filter(Boolean);
 return [...tree.values()].filter(n=>normalize(n.name).includes(q)||(n.country&&n.id.startsWith('country:')&&n.country.toLowerCase()===q))
  .sort((a,b)=>Number(normalize(b.name)===q)-Number(normalize(a.name)===q)||a.children.length-b.children.length).slice(0,10);
}

export function hasExplorerHistory(node:ExplorerNode,scope:Scope,areas:Set<string>):boolean{
 // A prefecture's manually saved depth never becomes a visit to every municipality.
 return node.scope===scope&&!(node.country==='JP'&&node.city)&&Boolean(node.area&&areas.has(node.area));
}
