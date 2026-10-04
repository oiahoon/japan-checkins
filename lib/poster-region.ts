import {projection,type MapFeature,type GeographicVisit,type Scope} from './geography.ts';
import {visitInExplorerNode,type ExplorerNode} from './map-explorer.ts';
import type {PuzzlePhoto} from './photo-puzzle.ts';

// A snapshot of public geometry and navigation, never a persistent user preference.
export type PosterRegion={node:ExplorerNode;name:string;scope:Scope;features:MapFeature[];unit:string;kicker:string;attribution:string;license:string;frame?:[number,number,number,number];fallbackFrom?:string};
export function posterRegions(path:ExplorerNode[]):PosterRegion[]{
 const result:PosterRegion[]=[];
 for(const node of path){
  if(node.hasBoundary===false||!node.features.length)continue;
  const jpCities=node.country==='JP'&&node.features.some(f=>!!f.properties.prefecture);
  const sources=[...new Set(node.features.map(f=>f.properties.source).filter(Boolean))];
  const years=[...new Set(node.features.map(f=>f.properties.year).filter(Boolean))];
  const osm=node.scope==='chengdu'||sources.some(s=>s!.includes('OSM')||s!.includes('OpenStreetMap'));
  const hdx=sources.some(s=>s!.includes('HDX'))||node.scope==='sichuan';
  const tw=sources.some(s=>s!.includes('内政部'));
  const attribution=jpCities?'地图：MLIT 2021 / SmartNews · 简化概览':node.country==='JP'?'地图：GSI / dataofjapan · 简化概览':osm?'地图：geoBoundaries / © OSM · openstreetmap.org/copyright · '+(years.join(' / ')||'2017')+' · 简化概览':tw?'地图：内政部 · '+(years.join(' / ')||'2021')+' · 简化概览':hdx?'地图：geoBoundaries / HDX · '+(years.join(' / ')||'2020')+' · CC BY 3.0 IGO · 简化修改':node.scope==='china'?'地图：geoBoundaries / Natural Earth · 简化概览':'地图：Natural Earth · 简化概览';
  const license=osm?'ODbL 1.0 https://opendatacommons.org/licenses/odbl/1-0/ . © OpenStreetMap https://www.openstreetmap.org/copyright . Modified: selected, translated and rounded geometries.':hdx?'CC BY 3.0 IGO https://creativecommons.org/licenses/by/3.0/igo/ . Source: https://data.humdata.org/dataset/cod-ab-chn . Modified: selected, translated and rounded geometries.':tw?'Taiwan Government Open Data License https://data.gov.tw/license . Modified: selected and rounded geometries.':jpCities?'Source: MLIT 2021 / SmartNews https://github.com/smartnews-smri/japan-topography . Modified: municipality labels and rounded geometry.':'';
  const district=node.district||node.features.some(f=>!!f.properties.district)||node.scope==='chengdu';
  const city=jpCities||node.features.some(f=>!!f.properties.city)||node.scope==='sichuan';
  const unit=node.id==='world'||node.id==='asia'||node.scope==='world'?'个国家 / 地区':district?'个区县':city?(node.country==='JP'?'个市区町村':'个市州'):node.country==='JP'?'个都道府县':'个省级地区';
  const kicker=({world:'WORLD',asia:'ASIA',japan:'JAPAN',china:'CHINA',sichuan:'SICHUAN',chengdu:'CHENGDU'} as Record<string,string>)[node.id]||node.country||'TRAVEL';
  result.push({node,name:node.name,scope:node.scope,features:node.features,unit,kicker,attribution,license,frame:node.id==='asia'?node.frame:undefined});
 }
 const last=path.at(-1),selected=result.at(-1);if(last&&selected&&selected.node.id!==last.id)selected.fallbackFrom=last.name;
 return result;
}

export function posterFeatureNode(region:PosterRegion,f:MapFeature):ExplorerNode{
 const n=region.node,p=f.properties;
 if(n.scope==='world')return {...n,id:'poster:'+p.id,country:p.code,area:'',features:[f],frame:undefined};
 if(n.country==='JP')return {...n,id:'poster:'+p.id,area:p.prefecture||n.area||p.name,city:p.prefecture?p.name:n.city,ambiguousCity:!!n.ambiguousCity||region.features.filter(v=>v.properties.name===p.name).length>1,features:[f],frame:undefined};
 const province=p.prefecture||n.province||(n.scope==='sichuan'||n.scope==='chengdu'?'四川省':n.area||p.name);
 return {...n,id:'poster:'+p.id,country:'CN',province,area:n.scope==='china'?province:n.area,city:p.city||n.city||(n.scope==='chengdu'?'成都市':n.scope==='sichuan'?p.name:undefined),district:p.district||n.district||(n.scope==='chengdu'?p.name:undefined),features:[f],frame:undefined};
}
export function posterVisitFeature(v:GeographicVisit,region:PosterRegion){
 if(!visitInExplorerNode(v,region.node))return undefined;
 return region.features.find(f=>visitInExplorerNode(v,posterFeatureNode(region,f)));
}
export function posterVisitArea(v:GeographicVisit,region:PosterRegion){return posterVisitFeature(v,region)?.properties.name||'';}
export function posterPhotoAreas(region:PosterRegion,visits:GeographicVisit[],photos:PuzzlePhoto[]){
 const groups=new Map<string,{feature:MapFeature;photos:(PuzzlePhoto&{note:string})[]}>();
 for(const visit of visits){
  const feature=posterVisitFeature(visit,region);if(!feature)continue;
  const key=String(feature.properties.id),group=groups.get(key)||{feature,photos:[]};
  for(const photo of photos.filter(p=>p.checkin===visit.id))if(!group.photos.some(p=>p.id===photo.id))group.photos.push({...photo,note:''});
  if(group.photos.length)groups.set(key,group);
 }
 return [...groups.values()];
}
export function posterRegionProjection(region:PosterRegion|undefined,features:MapFeature[],width:number,height:number,padding=20){
 if(!region?.frame)return projection(features,width,height,padding);
 const [left,bottom,right,top]=region.frame,cos=Math.max(.05,Math.cos((top+bottom)/2*Math.PI/180));
 const scale=Math.min((width-padding*2)/((right-left)*cos),(height-padding*2)/(top-bottom));
 return ([lon,lat]:number[])=>[width/2+(lon-(left+right)/2)*cos*scale,height/2-(lat-(bottom+top)/2)*scale];
}

// Japan photographs stay at municipality granularity, never enlarged to an unknown prefecture.
export function posterPuzzleRegion(region:PosterRegion,cities:MapFeature[]=[]):PosterRegion{
 if(region.node.country!=='JP'||region.features.some(f=>!!f.properties.prefecture))return region;
 return {...region,features:cities.filter(f=>!region.node.area||f.properties.prefecture===region.node.area)};
}
