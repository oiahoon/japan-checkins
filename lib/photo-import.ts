import {validCoordinate,validDate,type PhotoMetadata} from './photo-metadata.ts';
export const MAX_SOURCE_BYTES=100*1024*1024;
export function boundedSource(file:Blob){if(file.size>MAX_SOURCE_BYTES)throw Error('原图最多 100 MB');}
export async function inspectPhoto(file:Blob):Promise<PhotoMetadata>{
 boundedSource(file);
 try{const {default:exifr}=await import('exifr');const v=await exifr.parse(new Uint8Array(await file.arrayBuffer()),{reviveValues:false,translateValues:false,makerNote:false,userComment:false,xmp:false,icc:false,iptc:false,pick:['Make','Model','LensModel','FNumber','ExposureTime','ISO','FocalLength','DateTimeOriginal','OffsetTimeOriginal','Orientation','GPSLatitude','GPSLongitude','GPSLatitudeRef','GPSLongitudeRef']});
 return normalizeMetadata(v||{});
 }catch{return {warning:'照片元数据无法读取，请手动确认地点和日期'};}
}
export function normalizeMetadata(v:Record<string,unknown>):PhotoMetadata{
 const out:PhotoMetadata={};const camera:Record<string,string|number>={};
 for(const [tag,key]of Object.entries({Make:'make',Model:'model',LensModel:'lens',FNumber:'aperture',ExposureTime:'exposureSeconds',ISO:'iso',FocalLength:'focalLength'})){const n=v[tag];if(['make','model','lens'].includes(key)&&typeof n==='string'&&n.trim())camera[key]=n.trim().slice(0,120);else if(!['make','model','lens'].includes(key)&&typeof n==='number'&&Number.isFinite(n)&&n>0)camera[key]=n;}
 if(Object.keys(camera).length)out.camera=camera;
 const dms=(a:unknown,ref:unknown,positive:string,negative:string)=>{if(!Array.isArray(a)||a.length!==3||!a.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)||a[1]>=60||a[2]>=60||![positive,negative].includes(String(ref)))return undefined;return (a[0]+a[1]/60+a[2]/3600)*(ref===negative?-1:1)};
 if(v.latitude===undefined)v.latitude=dms(v.GPSLatitude,v.GPSLatitudeRef,'N','S');if(v.longitude===undefined)v.longitude=dms(v.GPSLongitude,v.GPSLongitudeRef,'E','W');
 if(validCoordinate(v.latitude,v.longitude))out.gps={latitude:v.latitude as number,longitude:v.longitude as number};
 const raw=v.DateTimeOriginal;if(typeof raw==='string'&&/^\d{4}:\d{2}:\d{2} [0-2]\d:[0-5]\d:[0-5]\d$/.test(raw)&&+raw.slice(11,13)<24){const d=raw.slice(0,10).replaceAll(':','-');if(validDate(d))out.date=d;}
 if(typeof v.OffsetTimeOriginal==='string'&&/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(v.OffsetTimeOriginal))out.offset=v.OffsetTimeOriginal;
 if(typeof v.Orientation==='number'&&v.Orientation>=1&&v.Orientation<=8)out.orientation=v.Orientation;
 if(!out.gps)out.warning='照片没有有效定位，请手动填写坐标或仅记录地区';return out;
}
export async function readablePhoto(file:File):Promise<Blob>{
 boundedSource(file);try{const b=await createImageBitmap(file);b.close();return file;}catch{}
 if(/\.(heic|heif)$/i.test(file.name)||/heic|heif/.test(file.type)){const {default:convert}=await import('heic2any');const result=await convert({blob:file,toType:'image/jpeg',quality:.9});return Array.isArray(result)?result[0]:result;}
 // RAW/DNG are not developed: use their embedded JPEG preview, when present.
 try{const {default:exifr}=await import('exifr');const bytes=await exifr.thumbnail(file);if(bytes?.length)return new Blob([new Uint8Array(bytes)],{type:'image/jpeg'});}catch{}
 throw Error('已尝试读取元数据，但这张 RAW / TIFF 没有可用预览，请导出保留 EXIF 的 JPEG 后上传');
}
