import {boundMapOffset,type MapOffset} from './poster-composition.ts';
import type {PosterStyle,PosterFormat} from './travel-poster.ts';
import type {PosterColors,PosterColorPreset} from './poster-style.ts';
export const posterPreferencesKey='travel-poster-styles-v1';
export type PosterPreferences={style:PosterStyle;format:PosterFormat;colors:PosterColors;colorPreset:PosterColorPreset;titleFont:'serif'|'sans';showSummary:boolean;showDates:boolean;labels:boolean;mapScale:number;mapOffset:MapOffset};
export type SavedPosterStyle={id:string;name:string;settings:PosterPreferences};
// A design template must never retain travel metadata or consent to include photos/GPS.
export function cleanPosterPreferences(value:unknown):PosterPreferences|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 if(!['paper','night','memories'].includes(String(v.style))||!['print','desktop','phone'].includes(String(v.format)))return null;
 const colors:PosterColors={},raw=v.colors as Record<string,unknown>|undefined;
 for(const k of ['background','land','accent'] as const)if(raw&&typeof raw[k]==='string'&&/^#[0-9a-f]{6}$/i.test(raw[k]))colors[k]=raw[k];
 const off=v.mapOffset as MapOffset|undefined;
 return {style:v.style as PosterStyle,format:v.format as PosterFormat,colors,colorPreset:(['default','sand','mist','ink'].includes(String(v.colorPreset))?v.colorPreset:'default') as PosterColorPreset,titleFont:v.titleFont==='sans'?'sans':'serif',showSummary:v.showSummary===true,showDates:v.showDates===true,labels:v.labels===true,mapScale:typeof v.mapScale==='number'&&Number.isFinite(v.mapScale)?Math.max(.5,Math.min(1.6,v.mapScale)):1,mapOffset:boundMapOffset({x:off?.x??0,y:off?.y??0})};
}
export function readPosterStyles(raw:string|null):SavedPosterStyle[]{
 try{if(!raw||raw.length>20000)return [];const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.styles))return [];
 const found=new Set<string>();return data.styles.slice(0,6).flatMap((s:SavedPosterStyle)=>{const settings=cleanPosterPreferences(s?.settings);if(!settings||typeof s.id!=='string'||!/^[-\w]{1,64}$/.test(s.id)||found.has(s.id)||typeof s.name!=='string'||!s.name.trim())return [];found.add(s.id);return [{id:s.id,name:s.name.trim().slice(0,24),settings}]});
 }catch{return []}
}
export function writePosterStyles(styles:SavedPosterStyle[]){return JSON.stringify({version:1,styles:readPosterStyles(JSON.stringify({version:1,styles}))})}
