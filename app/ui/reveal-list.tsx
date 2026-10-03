'use client';
import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {revealWindow} from '../../lib/reveal-window';
import {NeoButton} from './neo';
export function useRevealWindow(total:number,key:string,step=48){
 const [state,setState]=useState({key,limit:step});
 if(state.key!==key)setState({key,limit:step});
 const window=revealWindow(total,step,state,key);
 return {...window,more:()=>setState({key,limit:window.next})};
}
export function RevealMore({visible,total,onMore,label='显示更多'}:{visible:number;total:number;onMore:()=>void;label?:string}){
 if(visible>=total)return null;
 return <div className="journal-reveal"><span role="status">已显示 {visible} / {total}</span><NeoButton onClick={onMore}>{label}<ChevronDown size={16} aria-hidden="true"/></NeoButton></div>;
}
