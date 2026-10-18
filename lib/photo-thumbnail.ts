import sharp from 'sharp';
import {sanitizeJPEG} from './photo.ts';
export const THUMBNAIL_EDGE=768;
/** Separate private derivative; no crop, upscale, metadata, or changes to the viewing JPEG. */
export async function makeThumbnail(bytes:Uint8Array){
 const image=sharp(bytes,{limitInputPixels:8000000}).rotate().resize({width:THUMBNAIL_EDGE,height:THUMBNAIL_EDGE,fit:'inside',withoutEnlargement:true}).toColourspace('srgb');
 let result=sanitizeJPEG(await image.clone().jpeg({quality:82,mozjpeg:true}).toBuffer());
 if(result.length>512*1024)result=sanitizeJPEG(await image.clone().jpeg({quality:74,mozjpeg:true}).toBuffer());
 if(result.length>512*1024)throw Error('Thumbnail too large');return result;
}
