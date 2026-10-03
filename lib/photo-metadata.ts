// Bounded JPEG EXIF reader. Metadata stays in the browser until reviewed.
export type PhotoMetadata = {gps?: {latitude:number;longitude:number};date?:string;dateSource?:'original'|'digitized';dateStatus?:'read'|'missing'|'invalid'|'error';offset?:string;orientation?:number;warning?:string;camera?:Record<string,string|number>};
export function exifDate(raw:unknown){
 if(typeof raw!=='string')return;
 const m=raw.trim().match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T]([0-2]\d):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$/);
 if(!m||+m[4]>23)return;const date=m.slice(1,4).join('-');return validDate(date)?date:undefined;
}
export function readPhotoMetadata(bytes:Uint8Array):PhotoMetadata {
 const out:PhotoMetadata={};
 try {
  if(bytes.length<4||bytes[0]!==255||bytes[1]!==216)return {dateStatus:'error',warning:'图片没有可读取的 JPEG EXIF，请手动确认地点和日期'};
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let p=2;
  while(p+4<=bytes.length){if(bytes[p++]!==255)throw Error();let marker=bytes[p++];while(marker===255)marker=bytes[p++];if(marker===218||marker===217)break;if(marker===1||(marker>=208&&marker<=215))continue;const size=view.getUint16(p);if(size<2||p+size>bytes.length)throw Error();const start=p+2,end=p+size;p=end;
   if(marker!==225||end-start<14||String.fromCharCode(...bytes.slice(start,start+6))!=='Exif\0\0')continue;
   const base=start+6;const little=view.getUint16(base)===0x4949;if(!little&&view.getUint16(base)!==0x4d4d)throw Error();const check=(at:number,n:number)=>{if(!Number.isInteger(at)||at<base||n<0||at+n>end)throw Error();};const u16=(at:number)=>{check(at,2);return view.getUint16(at,little);};const u32=(at:number)=>{check(at,4);return view.getUint32(at,little);};if(u16(base+2)!==42)throw Error();
   type Entry={type:number;count:number;at:number};
   const ifd=(offset:number)=>{const at=base+offset;check(at,2);const count=u16(at);if(count>256)throw Error();check(at+2,count*12);const result=new Map<number,Entry>();for(let i=0;i<count;i++){const e=at+2+i*12,type=u16(e+2),n=u32(e+4);const unit=({1:1,2:1,3:2,4:4,5:8} as Record<number,number>)[type];if(!unit)continue;if(n>65536)throw Error();const len=n*unit,data=len<=4?e+8:base+u32(e+8);check(data,len);result.set(u16(e),{type,count:n,at:data});}return result;};
   const number=(e?:Entry)=>!e?undefined:e.count===1&&e.type===3?u16(e.at):e.count===1&&e.type===4?u32(e.at):undefined;
   const ascii=(e?:Entry)=>e?.type===2?String.fromCharCode(...bytes.slice(e.at,e.at+Math.min(e.count,128))).replace(/\0.*$/,'').trim():undefined;
   const root=ifd(u32(base+4));const orientation=number(root.get(0x112));if(orientation&&orientation>=1&&orientation<=8)out.orientation=orientation;
   const exifOffset=number(root.get(0x8769));if(exifOffset){const e=ifd(exifOffset),raw=ascii(e.get(0x9003)),digitizedRaw=ascii(e.get(0x9004)),original=exifDate(raw),digitized=exifDate(digitizedRaw),offset=ascii(e.get(0x9011));out.date=original||digitized;out.dateSource=original?'original':digitized?'digitized':undefined;out.dateStatus=out.date?'read':raw||digitizedRaw?'invalid':'missing';if(offset&&/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset))out.offset=offset;}
   const gpsOffset=number(root.get(0x8825));if(gpsOffset){const gps=ifd(gpsOffset);const dms=(e?:Entry)=>{if(!e||e.type!==5||e.count!==3)return;const n=[0,1,2].map(i=>{const den=u32(e.at+i*8+4);if(!den)throw Error();return u32(e.at+i*8)/den;});if(n[1]>=60||n[2]>=60)return;return n[0]+n[1]/60+n[2]/3600;};const lat=dms(gps.get(2)),lon=dms(gps.get(4)),ns=ascii(gps.get(1)),ew=ascii(gps.get(3));if(lat!==undefined&&lon!==undefined&&['N','S'].includes(ns||'')&&['E','W'].includes(ew||'')){const latitude=lat*(ns==='S'?-1:1),longitude=lon*(ew==='W'?-1:1);if(validCoordinate(latitude,longitude))out.gps={latitude,longitude};}}
   break;
  }
 }catch{return {dateStatus:'error',warning:'照片元数据不完整或无效，请手动确认地点和日期'};}
 out.dateStatus??='missing';
 if(!out.gps)out.warning='照片没有有效定位，请手动填写坐标或仅记录地区';
 return out;
}
export function validDate(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;}
export function validCoordinate(lat:unknown,lon:unknown):boolean{return typeof lat==='number'&&typeof lon==='number'&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;}
export type GeoFeature={properties:{name:string};geometry:{coordinates:number[][][][]}};
function inRing(lon:number,lat:number,ring:number[][]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];const cross=(lon-xi)*(yj-yi)-(lat-yi)*(xj-xi);if(Math.abs(cross)<1e-9&&lon>=Math.min(xi,xj)&&lon<=Math.max(xi,xj)&&lat>=Math.min(yi,yj)&&lat<=Math.max(yi,yj))return true;if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
export function prefectureAt(lat:number,lon:number,features:GeoFeature[]){if(!validCoordinate(lat,lon))return;return features.find(f=>f.geometry.coordinates.some(poly=>inRing(lon,lat,poly[0])&&!poly.slice(1).some(hole=>inRing(lon,lat,hole))))?.properties.name;}
// Persist only explicit confirmation, never an unreviewed EXIF proposal.
export function confirmedLocation(value:unknown,country='JP'):{latitude:number;longitude:number;source:'photo'|'manual'}|null {
 if(value==null)return null;if(typeof value!=='object')throw Error('请确认地图坐标');const v=value as Record<string,unknown>;
 if(v.confirmed!==true||!validCoordinate(v.latitude,v.longitude)||!['photo','manual'].includes(String(v.source))||(country==='JP'&&(Number(v.latitude)<20||Number(v.latitude)>46||Number(v.longitude)<122||Number(v.longitude)>154)))throw Error('请确认有效地图坐标');
 return {latitude:v.latitude as number,longitude:v.longitude as number,source:v.source as 'photo'|'manual'};
}
