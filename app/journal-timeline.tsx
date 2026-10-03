'use client';
import {useId,useMemo,useState} from 'react';
import {ChevronDown,ChevronRight,Images,MapPin,Utensils} from 'lucide-react';
import {timelineGroups} from '../lib/timeline';
import PhotoImage from './ui/photo-image';
import {NeoButton} from './ui/neo';
export type TimelineVisit={id:string;date:string;place:string;prefecture:string;city:string;district?:string;note:string;kind:string;eaten:number;depth:number};
type TimelinePhoto={id:string;checkin:string;url:string};
const levels=['未记录','未去过','路过','短暂停留','多次游览','深度探索'];
function Entry({visit,photos,onMap,onDetail,onPhoto}:{visit:TimelineVisit;photos:TimelinePhoto[];onMap:(id:string)=>void;onDetail:(id:string)=>void;onPhoto:(id:string)=>void}) {
 const [expanded,setExpanded]=useState(false),noteId=useId();
 const longNote=visit.note.length>100||visit.note.split('\n').length>3;
 return <article className={'chronicle-entry '+(!photos.length?'chronicle-entry--text':'')} aria-label={visit.place}>
  {photos.length>0&&<div className="chronicle-album">
   <button className="chronicle-cover" onClick={()=>onPhoto(photos[0].id)} aria-label={'查看照片：'+visit.place}>
    <PhotoImage src={photos[0].url} alt={visit.place+' 的照片'}/>
    {photos.length>1&&<span className="chronicle-photo-count"><Images size={14} aria-hidden="true"/>{photos.length}</span>}
   </button>
   {photos.length>1&&<div className="chronicle-thumbnails" aria-label={visit.place+' 的其他照片'}>{photos.slice(1).map((photo,i)=><button key={photo.id} onClick={()=>onPhoto(photo.id)} aria-label={`查看${visit.place}的照片 ${i+2}`}><PhotoImage src={photo.url} alt={`照片 ${i+2}`}/></button>)}</div>}
  </div>}
  <div className="chronicle-entry-body">
   <span className="chronicle-kind">{visit.kind==='restaurant'?<Utensils size={14} aria-hidden="true"/>:<MapPin size={14} aria-hidden="true"/>}{visit.kind==='restaurant'?'美食记录':'到访记录'}{visit.depth>0&&levels[visit.depth]&&' · '+levels[visit.depth]}{visit.kind==='restaurant'&&!!visit.eaten&&' · 已吃过'}</span>
   <h4><button onClick={()=>onMap(visit.id)} aria-label={'在地图查看：'+visit.place}>{visit.place}</button></h4>
   <p className="chronicle-location">{[visit.prefecture,visit.city,visit.district].filter(Boolean).join(' / ')}</p>
   {visit.note&&<div className="chronicle-note"><p id={noteId} className={longNote&&!expanded?'is-clamped':''}>{visit.note}</p>{longNote&&<button className="chronicle-note-toggle" aria-expanded={expanded} aria-controls={noteId} onClick={()=>setExpanded(v=>!v)}>{expanded?'收起笔记':'展开笔记'}<ChevronDown size={14} aria-hidden="true"/></button>}</div>}
   <div className="chronicle-entry-actions"><NeoButton onClick={()=>onMap(visit.id)}><MapPin size={15} aria-hidden="true"/>查看地图</NeoButton><NeoButton variant="quiet" onClick={()=>onDetail(visit.id)} aria-label={'查看记录：'+visit.place}>查看记录<ChevronRight size={14} aria-hidden="true"/></NeoButton></div>
  </div>
 </article>;
}
export default function JournalTimeline({visits,photos,onMap,onDetail,onPhoto}:{visits:TimelineVisit[];photos:TimelinePhoto[];onMap:(id:string)=>void;onDetail:(id:string)=>void;onPhoto:(id:string)=>void}) {
 const groups=useMemo(()=>timelineGroups(visits),[visits]),prefix=useId();
 const photoIndex=useMemo(()=>{const index=new Map<string,TimelinePhoto[]>();for(const photo of photos){const bucket=index.get(photo.checkin)||[];bucket.push(photo);index.set(photo.checkin,bucket)}return index},[photos]);
 return <div className="journal-chronicle">
  {groups.length>1&&<nav className="chronicle-months" aria-label="按月浏览">{groups.map(group=><a key={group.key} href={'#'+prefix+group.key}>{group.label}<span>{group.count}</span></a>)}</nav>}
  {groups.map(group=><section className="chronicle-month" key={group.key} aria-labelledby={prefix+group.key}>
   <header className="chronicle-month-heading"><h3 id={prefix+group.key} tabIndex={-1}>{group.label}</h3><span>{group.count} 次到访</span></header>
   <ol className="chronicle-days">{group.days.map(day=><li className="chronicle-day" key={day.date}>
    <div className="chronicle-date">{day.date?<time dateTime={day.date} aria-label={day.date}><strong>{day.day}</strong><span>{day.weekday}</span></time>:<span>日期待补充</span>}</div>
    <div className="chronicle-day-entries">{day.records.map(visit=><Entry key={visit.id} visit={visit} photos={photoIndex.get(visit.id)||[]} onMap={onMap} onDetail={onDetail} onPhoto={onPhoto}/>)}</div>
   </li>)}</ol>
  </section>)}
 </div>;
}
