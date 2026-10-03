'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Search,MapPin,LoaderCircle} from 'lucide-react';
import {NeoInput} from './ui/neo';
import {lookupPlace,type PlaceMatch} from '../lib/place-lookup';
import {placeSuggestion,type PlaceSuggestion} from '../lib/place-search';

export default function PlaceSearch({value,entries,onChange,onSelect,onLocal,endpoint='/api/places',loadingLocal=false,localError=false}:{loadingLocal?:boolean;localError?:boolean;endpoint?:string;value:string;entries:PlaceMatch[];onChange:(value:string)=>void;onSelect:(place:PlaceSuggestion)=>void;onLocal:(place:PlaceMatch)=>void}){
 const id=useId(),input=useRef<HTMLInputElement>(null),cache=useRef(new Map<string,PlaceSuggestion[]>());
 const [focused,setFocused]=useState(false),[edited,setEdited]=useState(false),[composing,setComposing]=useState(false),[enabled,setEnabled]=useState(false),[remote,setRemote]=useState<{query:string;items:PlaceSuggestion[]}>({query:'',items:[]}),[active,setActive]=useState(-1),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(active>=0)document.getElementById(id+'-option-'+active)?.scrollIntoView({block:'nearest'})},[active,id]);
 const query=value.trim(),localMatches=useMemo(()=>lookupPlace(value,entries),[value,entries]),local=localMatches.candidates;
 useEffect(()=>{const controller=new AbortController();fetch(endpoint,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(6500)]),cache:'no-store'}).then(r=>r.ok?r.json() as Promise<{enabled?:boolean}>:null).then(data=>{if(!controller.signal.aborted)setEnabled(data?.enabled===true)}).catch(()=>{});return()=>controller.abort()},[endpoint]);
 useEffect(()=>{
  setActive(-1);setError('');setBusy(false);
  if(!enabled||!edited||!focused||composing||query.length<2)return;
  const cached=cache.current.get(query);if(cached){setRemote({query,items:cached});return}
  const controller=new AbortController();
  const timer=setTimeout(()=>{setBusy(true);fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(6500)]),cache:'no-store'})
   .then(async r=>{const data=await r.json() as {results?:unknown[];error?:string};if(!r.ok)throw Error(data.error||'地点搜索暂时不可用');if(!Array.isArray(data.results))throw Error();return data.results.map((v:unknown)=>placeSuggestion.safeParse(v)).filter((v:ReturnType<typeof placeSuggestion.safeParse>)=>v.success).map((v:{data:PlaceSuggestion})=>v.data) as PlaceSuggestion[]})
   .then(items=>{if(controller.signal.aborted)return;if(cache.current.size>=20)cache.current.delete(cache.current.keys().next().value!);cache.current.set(query,items);setRemote({query,items});setActive(-1)})
   .catch(e=>{if(!controller.signal.aborted){setRemote({query,items:[]});setError(e.message||'地点搜索暂时不可用')}}).finally(()=>{if(!controller.signal.aborted)setBusy(false)})},450);
  return()=>{clearTimeout(timer);controller.abort()};
 },[query,edited,focused,enabled,composing,endpoint]);
 const options=[...(remote.query===query?remote.items:[]).map(place=>({key:place.id,name:place.name,label:place.label,choose:()=>onSelect(place)})),...local.map(place=>({key:place.country+'/'+place.prefecture+'/'+place.city+'/'+place.name,name:localMatches.automatic===place?query:place.name,label:[place.country==='JP'?'日本':place.country==='CN'?'中国':place.country,place.prefecture,place.city].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · '),choose:()=>onLocal({...place,name:localMatches.automatic===place?query:place.name})}))].slice(0,10);
 const open=focused&&edited&&query.length>=2,pending=enabled&&open&&!composing&&remote.query!==query&&!error;
 function choose(index:number){options[index]?.choose();setFocused(false);setEdited(false);setActive(-1);input.current?.focus()}
 return <div className="photo-place-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false)}}>
  <label htmlFor={id}>地点</label><div className="photo-place-input"><Search size={17} aria-hidden="true"/><NeoInput id={id} ref={input} value={value} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open?id+'-list':undefined} aria-activedescendant={open&&active>=0?id+'-option-'+active:undefined} aria-describedby="photo-place-region" autoComplete="off" maxLength={150} placeholder="搜索城市、车站或具体地点" onFocus={()=>setFocused(true)} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} onChange={e=>{setEdited(true);setFocused(true);onChange(e.target.value)}} onKeyDown={e=>{
   if(e.nativeEvent.isComposing)return;
   if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setFocused(false);return}
   if((e.key==='ArrowDown'||e.key==='ArrowUp')&&options.length){e.preventDefault();setFocused(true);setEdited(true);setActive(i=>e.key==='ArrowDown'?(i+1)%options.length:(i<=0?options.length-1:i-1));return}
   if(e.key==='Enter'&&open){e.preventDefault();if(active>=0)choose(active)}
  }}/>{(busy||pending||loadingLocal)&&<LoaderCircle size={16} className="spinner" aria-label="正在搜索地点"/>}</div>
  {open&&<div className="photo-place-candidates"><div id={id+'-list'} role="listbox" aria-label="地点建议">{options.map((option,index)=><button id={id+'-option-'+index} role="option" aria-selected={index===active} type="button" key={option.key} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(index)}><MapPin size={15} aria-hidden="true"/><span>{option.name}<small>{option.label}</small></span></button>)}</div>{loadingLocal&&<p role="status">读取地点建议…</p>}{(busy||pending)&&<p role="status">搜索中…</p>}{error&&<p role="status">{error}，也可手动填写</p>}{!loadingLocal&&!busy&&!pending&&!composing&&!error&&!options.length&&<p role="status">{localError?'地点建议暂时不可用，可手动填写':'未找到建议，可直接填写并选择所属地区'}</p>}{enabled&&<small className="place-attribution">地点搜索：<a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></small>}</div>}
 </div>;
}
