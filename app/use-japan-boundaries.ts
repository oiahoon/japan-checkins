'use client';
import {useEffect,useMemo,useState} from 'react';
import {japanShard} from '../lib/japan-boundaries';
import {loadBoundary} from '../lib/boundary-loader';
import type {MapFeature} from '../lib/geography';
/** Scope cancellation belongs to this consumer; already parsed public shards remain reusable. */
export function useJapanBoundaries(prefectures:string[],attempt=0){
 const key=JSON.stringify([...new Set(prefectures.filter(p=>!!japanShard(p)))].sort());
 const [loaded,setLoaded]=useState<Record<string,MapFeature[]>>({}),[failure,setFailure]=useState('');
 useEffect(()=>{const abort=new AbortController();setFailure('');const wanted=JSON.parse(key) as string[];
  void Promise.all(wanted.map(async p=>{const features=await loadBoundary(japanShard(p)!,abort.signal);if(!abort.signal.aborted)setLoaded(old=>old[p]===features?old:{...old,[p]:features})})).catch(()=>{if(!abort.signal.aborted)setFailure(key)});
  return()=>abort.abort();
 },[key,attempt]);
 const ready=(JSON.parse(key) as string[]).every(p=>!!loaded[p]);
 return {features:useMemo(()=>Object.values(loaded).flat(),[loaded]),ready,error:failure===key,loading:!ready&&failure!==key};
}
