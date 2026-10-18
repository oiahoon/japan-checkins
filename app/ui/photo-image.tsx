'use client';
import {usePhotoSource} from '../journal-transport';
import {useEffect,useRef,useState} from 'react';
import {ImageOff,LoaderCircle} from 'lucide-react';
/** A stable image slot. Retries stay on the same authenticated image endpoint. */
export default function PhotoImage({src,alt,loading='lazy',fit='cover',className='',retryable=false}:{src:string;alt:string;loading?:'lazy'|'eager';fit?:'cover'|'contain';className?:string;retryable?:boolean}){
 const slot=useRef<HTMLSpanElement>(null),image=useRef<HTMLImageElement>(null),[nearby,setNearby]=useState(loading==='eager'),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
 const retrySrc=attempt&&!src.startsWith('blob:')&&!src.startsWith('data:')?src+(src.includes('?')?'&':'?')+'retry='+attempt:src;
 // Native img lazy loading cannot defer the authenticated fetch that creates a blob URL.
 // Observe the slot instead, including inside scrolling sheets, with a small prefetch margin.
 useEffect(()=>{if(nearby)return;if(loading==='eager'||typeof IntersectionObserver==='undefined'){setNearby(true);return}const node=slot.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setNearby(true);observer.disconnect()}},{rootMargin:'160px'});observer.observe(node);return()=>observer.disconnect()},[nearby,loading]);
 const resolved=usePhotoSource(retrySrc,nearby);
 useEffect(()=>setAttempt(0),[src]);
 useEffect(()=>setState(resolved.error?'error':resolved.url&&image.current?.complete&&image.current.naturalWidth?'ready':'loading'),[src,resolved.url,resolved.error]);
 return <span ref={slot} className={'journal-photo '+className} data-state={nearby?state:'waiting'} style={{'--photo-fit':fit} as React.CSSProperties} aria-busy={nearby&&state==='loading'}><img ref={image} key={src+attempt} src={resolved.url} alt={alt} loading={loading} decoding="async" onLoad={()=>setState('ready')} onError={()=>setState('error')}/>{nearby&&state==='loading'&&<span className="journal-photo-status" aria-hidden="true"><LoaderCircle size={20} className="spinner"/><span className="sr-only">正在读取照片</span></span>}{state==='error'&&<span className="journal-photo-status" role="status"><ImageOff size={22}/><span>照片未能读取</span><span className="journal-photo-retry">{retryable&&<button type="button" onClick={()=>{setState('loading');setAttempt(n=>n+1)}}>重试读取</button>}</span></span>}</span>;
}
