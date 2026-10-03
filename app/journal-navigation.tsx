'use client';
import {Map,MapPinned,Clock3,Images,Plus,LockKeyhole,LogOut} from 'lucide-react';
import {NeoButton,NeoSegmented} from './ui/neo';
import ThemeToggle from './ui/theme-toggle';
export type JournalView='map'|'timeline'|'photos';
type NavigationProps={tab:string;onTab:(view:JournalView)=>void;onRecord:()=>void;github:boolean;canManage:boolean;shared:boolean;storageReady:boolean};
export function JournalHeader({tab,onTab,onRecord,github,canManage,shared,storageReady}:NavigationProps){
 const views=[{value:'map',label:'地图',icon:<Map size={18}/>},{value:'timeline',label:'时间线',icon:<Clock3 size={18}/>},...(github&&canManage?[{value:'photos',label:'照片',icon:<Images size={18}/>}]:[])];
 return <header className="journal-header"><a className="journal-brand" href="/" aria-label="我的旅行足迹首页"><MapPinned size={28} strokeWidth={1.5}/><h1>我的旅行足迹</h1></a><nav className="journal-desktop-nav" aria-label="主导航"><NeoSegmented label="旅行视图" value={tab} onChange={v=>onTab(v as JournalView)} options={views}/></nav><div className="journal-header-actions"><ThemeToggle/><span className="journal-access"><LockKeyhole size={15}/>{shared?'公开地图':canManage?'主人空间':'只读访问'}</span>{github?(shared?<a className="journal-login" href="/login">主人登录</a>:<form action="/api/auth/logout" method="post"><button className="journal-signout" type="submit" aria-label="退出登录"><LogOut size={18}/><span>退出登录</span></button></form>):<a href="/signout-with-chatgpt?return_to=/" target="_top" className="journal-signout" aria-label="退出登录"><LogOut size={18}/><span>退出登录</span></a>}{canManage&&storageReady&&<NeoButton className="journal-record" variant="primary" onClick={onRecord}><Plus size={18}/>记录旅行</NeoButton>}</div></header>;
}
export function JournalMobileNav({tab,onTab,onRecord,github,canManage,storageReady}:NavigationProps){
 const options=[{value:'map',label:'地图',icon:<Map size={21}/>},...(canManage&&storageReady?[{value:'record',label:'记录旅行',icon:<Plus size={21}/>}]:[]),{value:'timeline',label:'时间线',icon:<Clock3 size={21}/>},...(github&&canManage?[{value:'photos',label:'照片',icon:<Images size={21}/>}]:[])];
 return <nav className="journal-mobile-nav" aria-label="手机导航" style={{'--segment-count':options.length,'--segment-index':Math.max(0,options.findIndex(v=>v.value===tab))} as React.CSSProperties}><span className="segment-thumb" aria-hidden="true"/>{options.map(v=><button type="button" key={v.value} className={v.value==='record'?'journal-mobile-record':undefined} aria-pressed={v.value==='record'?undefined:tab===v.value} onClick={()=>v.value==='record'?onRecord():onTab(v.value as JournalView)}>{v.icon}<span>{v.label}</span></button>)}</nav>;
}
