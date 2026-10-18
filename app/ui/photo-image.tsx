'use client';
import {usePhotoSource} from '../journal-transport';
import {useEffect,useRef,useState} from 'react';
import {ImageOff,LoaderCircle} from 'lucide-react';
/** A stable image slot. Retries stay on the same authenticated image endpoint. */
export default function PhotoImage({src,alt,loading='lazy',fit='cover',className='',retryable=false}:{src:string;alt:string;loading?:'lazy'|'eager';fit?:'cover'|'contain';className?:string;retryable?:boolean}){
 const image=useRef<HTMLImageElement>(null),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
 const retrySrc=attempt&&!src.startsWith('blob:')&&!src.startsWith('data:')?src+(src.includes('?')?'&':'?')+'retry='+attempt:src;
 const resolved=usePhotoSource(retrySrc);
 useEffect(()=>setAttempt(0),[src]);
 useEffect(()=>setState(resolved.error?'error':resolved.url&&image.current?.complete&&image.current.naturalWidth?'ready':'loading'),[src,resolved.url,resolved.error]);
 return <span className={'journal-photo '+className} data-state={state} style={{'--photo-fit':fit} as React.CSSProperties} aria-busy={state==='loading'}><img ref={image} key={src+attempt} src={resolved.url} alt={alt} loading={loading} decoding="async" onLoad={()=>setState('ready')} onError={()=>setState('error')}/>{state==='loading'&&<span className="journal-photo-status" aria-hidden="true"><LoaderCircle size={20} className="spinner"/><span className="sr-only">正在读取照片</span></span>}{state==='error'&&<span className="journal-photo-status" role="status"><ImageOff size={22}/><span>照片未能读取</span><span className="journal-photo-retry">{retryable&&<button type="button" onClick={()=>{setState('loading');setAttempt(n=>n+1)}}>重试读取</button>}</span></span>}</span>;
}
