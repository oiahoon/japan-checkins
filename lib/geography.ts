import {prefectureAt,validCoordinate} from './photo-metadata.ts';
export type Scope='japan'|'sichuan'|'china'|'world';
export type MapFeature={type?:string;properties:{id:number;name:string;code?:string};geometry:{type?:string;coordinates:number[][][][]}};
export const scopes:{id:Scope;name:string;label:string}[]=[{id:'japan',name:'日本',label:'都道府县'},{id:'sichuan',name:'四川',label:'城市 / 州'},{id:'china',name:'中国',label:'省 / 自治区 / 直辖市'},{id:'world',name:'世界',label:'国家 / 地区'}];
export const sichuanCities=['成都市','自贡市','攀枝花市','泸州市','德阳市','绵阳市','广元市','遂宁市','内江市','乐山市','南充市','眉山市','宜宾市','广安市','达州市','雅安市','巴中市','资阳市','阿坝藏族羌族自治州','甘孜藏族自治州','凉山彝族自治州'];
export type GeographicVisit={country?:string;prefecture:string;city:string;latitude?:number|null;longitude?:number|null;id:string;place:string;date:string};
export function countryOf(v:{country?:string;prefecture:string}){return v.country||'JP';}
export function statusPrefix(country:string,area:string){return country==='JP'?area:country+' / '+area;}
export function inScope(v:GeographicVisit,scope:Scope){const c=countryOf(v);return scope==='world'||(scope==='japan'?c==='JP':c==='CN'&&(scope==='china'||v.prefecture==='四川省'));}
export function visitArea(v:GeographicVisit,scope:Scope,world:MapFeature[]=[]){return scope==='sichuan'?v.city:scope==='world'?(world.find(f=>f.properties.code===countryOf(v))?.properties.name||countryOf(v)):v.prefecture;}
export function mapFeatures(scope:Scope,geos:Record<'japan'|'china'|'world',MapFeature[]>){return scope==='sichuan'?geos.china.filter(f=>f.properties.name==='四川省'):geos[scope];}
export function coordinateInScope(lat:number,lon:number,scope:Scope,geos:Record<'japan'|'china'|'world',MapFeature[]>){if(!validCoordinate(lat,lon))return false;if(scope==='world')return true;return Boolean(prefectureAt(lat,lon,mapFeatures(scope,geos)));}
export function bounds(features:MapFeature[]):[number,number,number,number]{const points=features.flatMap(f=>f.geometry.coordinates.flatMap(p=>p.flat()));if(!points.length)return [-180,-85,180,85];return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
export function projection(features:MapFeature[],width:number,height:number,padding=20){const [left,bottom,right,top]=bounds(features),cos=Math.cos((bottom+top)/2*Math.PI/180);const sx=Math.max(.05,cos),scale=Math.min((width-padding*2)/Math.max(.01,(right-left)*sx),(height-padding*2)/Math.max(.01,top-bottom));return ([lon,lat]:number[])=>[width/2+(lon-(left+right)/2)*sx*scale,height/2-(lat-(top+bottom)/2)*scale];}
export function featurePath(f:MapFeature,project:(p:number[])=>number[]){return f.geometry.coordinates.map(poly=>poly.map(ring=>'M'+ring.map(p=>project(p).map(n=>n.toFixed(2)).join(',')).join('L')+'Z').join(' ')).join(' ');}
