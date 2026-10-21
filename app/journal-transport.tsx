'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {PhotoLoader} from '../lib/photo-loader';
import {createPhotoDeliveryReader} from '../lib/photo-delivery';
import {isPhotoSource,type PhotoReadOptions,type PhotoPriority} from '../lib/photo-source';
export type JournalTransport={request:(url:string,init?:RequestInit)=>Promise<Response>;photo:(src:string,options?:PhotoReadOptions)=>Promise<Blob>;photoURL:(src:string,options?:PhotoReadOptions)=>Promise<string>;disconnect:()=>void};
export const JournalTransportContext=createContext<JournalTransport|null>(null);
export const useJournalTransport=()=>useContext(JournalTransportContext);
let webPhotos:PhotoLoader|undefined;
// A viewing JPEG can be 3 MiB: 30s is shorter than its transfer at 48 KiB/s.
export function browserPhotos(){if(typeof window==='undefined')throw Error('Browser photo reader only');return webPhotos??=new PhotoLoader(createPhotoDeliveryReader())}
export function usePhotoSource(src:string,enabled=true,priority:PhotoPriority='foreground'){
 const client=useJournalTransport(),[resolved,setResolved]=useState<{key:string;url?:string;error?:boolean}>({key:''});
 const custom=isPhotoSource(src);
 useEffect(()=>{if(!custom||!enabled)return;const abort=new AbortController(),options={signal:abort.signal,priority};(client?client.photoURL(src,options):browserPhotos().url(src,options)).then(url=>{if(!abort.signal.aborted)setResolved({key:src,url})}).catch(()=>{if(!abort.signal.aborted)setResolved({key:src,error:true})});return()=>abort.abort()},[client,custom,src,enabled,priority]);
 return custom?(resolved.key===src?resolved:{key:src}):{key:src,url:src};
}
