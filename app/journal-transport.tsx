'use client';
import {createContext,useContext,useEffect,useState} from 'react';
export type JournalTransport={request:(url:string,init?:RequestInit)=>Promise<Response>;photo:(src:string)=>Promise<Blob>;photoURL:(src:string)=>Promise<string>;disconnect:()=>void};
export const JournalTransportContext=createContext<JournalTransport|null>(null);
export const useJournalTransport=()=>useContext(JournalTransportContext);
export function usePhotoSource(src:string,enabled=true){
 const client=useJournalTransport(),[resolved,setResolved]=useState<{key:string;url?:string;error?:boolean}>({key:''});
 const custom=!!client&&src.startsWith('/api/photos/');
 useEffect(()=>{if(!client||!custom||!enabled)return;let cancelled=false;client.photoURL(src).then(url=>{if(!cancelled)setResolved({key:src,url})}).catch(()=>{if(!cancelled)setResolved({key:src,error:true})});return()=>{cancelled=true}},[client,custom,src,enabled]);
 return custom?(resolved.key===src?resolved:{key:src}):{key:src,url:src};
}
