'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {X,ChevronDown,MapPin,Check,ZoomIn,FileImage} from 'lucide-react';
import {NeoInput,NeoTextarea,NeoCheckbox,NeoButton} from './ui/neo';
import NeoNotification from './ui/notification';
import SelectField from './select-field';
import type {LibraryPhoto} from './photo-library';
import type {PhotoDetails} from '../lib/travel-data';
import {prefectureAt,validCoordinate,type PhotoMetadata} from '../lib/photo-metadata';
import {inspectPhoto} from '../lib/photo-import';
import {lookupPlace,applyPlaceMatch,type PlaceMatch} from '../lib/place-lookup';
import type {MapFeature} from '../lib/geography';
export default function PhotoEditor({photo,geos,onSave,onClose,onView}:{photo:LibraryPhoto;geos:{japan:MapFeature[];china:MapFeature[];sichuan:MapFeature[];world:MapFeature[];japanCities?:MapFeature[]};onSave:(id:string,details:PhotoDetails,confirmed:boolean)=>Promise<void>;onClose:()=>void;onView:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),sourceInput=useRef<HTMLInputElement>(null),placeInput=useRef<HTMLInputElement>(null),placeTouched=useRef(false),gpsApplied=useRef(false);
 const [d,setD]=useState<PhotoDetails>(()=>({...photo.details,date:photo.details.date||photo.proposal?.date||''})),[confirmed,setConfirmed]=useState(photo.marked),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [places,setPlaces]=useState<PlaceMatch[]>([]),[queryFocused,setQueryFocused]=useState(false),[locationMessage,setLocationMessage]=useState(''),[recovered,setRecovered]=useState<PhotoMetadata>(),[reading,setReading]=useState(false);
 useEffect(()=>{dialog.current?.showModal();let active=true;fetch('/place-index.json').then(r=>{if(!r.ok)throw Error();return r.json() as Promise<PlaceMatch[]>}).then(entries=>{if(!active||!Array.isArray(entries))return;setPlaces(entries);if(placeTouched.current)setD(v=>{const match=lookupPlace(v.place,entries).automatic;return match?applyPlaceMatch(v,match):v})}).catch(()=>{});return()=>{active=false}},[]);
 const patch=(value:Partial<PhotoDetails>)=>{setD(v=>({...v,...value}));if(Object.keys(value).some(k=>k!=='note'))setConfirmed(false)};
 const gps=recovered?.gps||photo.proposal?.gps;
 const gpsValue=useMemo(()=>{if(!gps)return;const jp=prefectureAt(gps.latitude,gps.longitude,geos.japan),cn=prefectureAt(gps.latitude,gps.longitude,geos.china),area=!jp&&!cn?geos.world.find(f=>prefectureAt(gps.latitude,gps.longitude,[f])):undefined;return {latitude:gps.latitude,longitude:gps.longitude,country:jp?'JP':cn?'CN':area?.properties.code||'',prefecture:jp||cn||area?.properties.name||'',city:jp?prefectureAt(gps.latitude,gps.longitude,(geos.japanCities||[]).filter(f=>(f.properties as {prefecture?:string}).prefecture===jp))||'':cn==='四川省'?prefectureAt(gps.latitude,gps.longitude,geos.sichuan)||'':''};},[gps,geos.japan,geos.china,geos.world,geos.sichuan,geos.japanCities]);
 useEffect(()=>{if(gpsApplied.current||!gpsValue||!geos.japan.length||!geos.world.length)return;gpsApplied.current=true;if(!photo.marked&&gpsValue.country)setD(v=>v.country?v:{...v,...gpsValue})},[gpsValue,geos.japan.length,geos.world.length,photo.marked]);
 const regionOptions=d.country==='JP'?geos.japan:d.country==='CN'?geos.china:[];
 const countryName=({JP:'日本',CN:'中国'} as Record<string,string>)[d.country]||geos.world.find(f=>f.properties.code===d.country)?.properties.name||d.country;
 const complete=Boolean(d.country&&d.prefecture&&d.place.trim()&&d.date),matches=useMemo(()=>lookupPlace(d.place,places),[d.place,places]);
 const reconfirm=photo.marked&&(['country','prefecture','city','place','date','latitude','longitude'] as const).some(k=>d[k]!==photo.details[k]);
 const dateMeta=recovered||photo.proposal;
 const dateHint=d.date===dateMeta?.date?(dateMeta?.dateSource==='digitized'?'来自照片数字化日期，请核对':dateMeta?.date?'来自照片拍摄日期':''):!d.date?(({missing:'原文件未提供 EXIF 日期',invalid:'EXIF 日期无效',error:'照片元数据读取失败'} as Record<string,string>)[dateMeta?.dateStatus||'']||'尚未读取到拍摄日期'):'';
 function chooseMatch(match:PlaceMatch,input=d.place){const next=applyPlaceMatch({...d,place:input},match);setLocationMessage(d.latitude!==null&&next.latitude===null?'地点已更改，原坐标已清除':'');patch(next);setQueryFocused(false);placeInput.current?.focus()}
 function changePlace(input:string){placeTouched.current=true;const result=lookupPlace(input,places);if(result.automatic)chooseMatch(result.automatic,input);else{patch({place:input});setQueryFocused(true)}}
 async function readSource(file?:File){if(!file)return;setReading(true);setError('');try{const metadata=await inspectPhoto(file);setRecovered(metadata);if(metadata.date){patch({date:metadata.date})}else setError(metadata.dateStatus==='error'?'原图元数据读取失败':metadata.dateStatus==='invalid'?'原图日期无效，请手动填写':'原图未提供 EXIF 日期，请手动填写')}catch(e){setError((e as Error).message)}finally{setReading(false);if(sourceInput.current)sourceInput.current.value=''}}
 async function submit(){setBusy(true);setError('');try{await onSave(photo.id,d,confirmed);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <dialog ref={dialog} className="photo-editor" aria-labelledby="photo-editor-title" onCancel={e=>busy||reading?e.preventDefault():onClose()} onClose={onClose}>
  <header className="photo-editor-header"><div><h2 id="photo-editor-title">这一张的记忆</h2><p>{photo.marked?'已保存 · 已标记地图':Object.values(photo.details).some(v=>typeof v==='string'&&v.trim())?'信息已保存 · 尚未标记地图':'已存入照片记录 · 可以稍后补充'}</p></div><button className="icon-button" aria-label="关闭照片编辑" disabled={busy||reading} onClick={onClose}><X size={20}/></button></header>
  <form onSubmit={e=>{e.preventDefault();void submit()}}><div className="photo-editor-scroll">
   <button type="button" className="photo-editor-preview" onClick={onView} aria-label="放大查看照片"><img src={photo.url} alt="正在整理的照片"/><span><ZoomIn size={15}/>查看照片</span></button>
   <fieldset disabled={busy||reading}><section className="photo-editor-primary"><h3><MapPin size={17}/>在哪里，哪一天？</h3>
    <div className="photo-place-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setQueryFocused(false)}}><label>地点<NeoInput ref={placeInput} value={d.place} autoComplete="off" maxLength={150} placeholder="福冈、博多站，或具体地点" onFocus={()=>setQueryFocused(true)} onChange={e=>changePlace(e.target.value)} aria-describedby="photo-place-region"/></label>
     {queryFocused&&!matches.automatic&&matches.candidates.length>0&&<div className="photo-place-candidates" aria-label="地点建议">{matches.candidates.map(m=><button type="button" key={m.country+m.prefecture+m.name} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseMatch(m)}><MapPin size={15}/><span>{m.name}<small>{m.country==='JP'?'日本':m.country==='CN'?'中国':m.country} · {m.prefecture}{m.city&&m.city!==m.name?' · '+m.city:''}</small></span></button>)}</div>}
    </div>
    <details className="photo-region-adjust" key={d.country?'located':'missing'} open={!d.country||!d.prefecture||undefined}><summary id="photo-place-region"><span>{d.country?[...new Set([countryName,d.prefecture,d.city].filter(Boolean))].join(' · '):'选择所属地区'}<small>{d.country&&d.prefecture?'调整':'手动选择'}</small></span><ChevronDown size={16}/></summary><div className="photo-region-fields"><div className="photo-editor-two"><label>国家 / 地区<SelectField aria-label="照片国家" value={d.country} onChange={e=>patch({country:e.target.value,prefecture:'',city:'',latitude:null,longitude:null})}><option value="">待补充</option><option value="JP">日本</option><option value="CN">中国</option>{geos.world.filter(f=>!['JP','CN'].includes(f.properties.code||'')).map(f=><option key={f.properties.id} value={f.properties.code}>{f.properties.name}</option>)}</SelectField></label><label>地区{regionOptions.length?<SelectField aria-label="照片地区" value={d.prefecture} onChange={e=>patch({prefecture:e.target.value,city:'',latitude:null,longitude:null})}><option value="">待补充</option>{regionOptions.map(f=><option key={f.properties.id}>{f.properties.name}</option>)}</SelectField>:<NeoInput value={d.prefecture} placeholder="地区待补充" maxLength={50} onChange={e=>patch({prefecture:e.target.value,latitude:null,longitude:null})}/>}</label></div><label>城市{d.country==='CN'&&d.prefecture==='四川省'?<SelectField aria-label="照片城市" value={d.city} onChange={e=>patch({city:e.target.value,latitude:null,longitude:null})}><option value="">待补充</option>{geos.sichuan.map(f=><option key={f.properties.id}>{f.properties.name}</option>)}</SelectField>:<NeoInput value={d.city} maxLength={100} placeholder="城市（可选）" onChange={e=>patch({city:e.target.value,latitude:null,longitude:null})}/>}</label></div></details>
    {locationMessage&&<p className="photo-editor-hint" role="status">{locationMessage}</p>}
    {gps&&(!photo.marked||recovered)&&<button type="button" className="photo-proposal" onClick={()=>{if(gpsValue)patch(gpsValue);setLocationMessage('')}}>使用照片定位建议</button>}
    <label>日期<NeoInput type="date" value={d.date} onInput={e=>patch({date:e.currentTarget.value})} onChange={e=>patch({date:e.target.value})}/>{dateHint&&<small className="photo-date-hint">{dateHint}</small>}</label>
    <label>笔记 <span>可选</span><NeoTextarea rows={3} value={d.note} maxLength={1000} placeholder="那一刻，想留下什么？" onChange={e=>patch({note:e.target.value})}/></label>
    <NeoCheckbox checked={confirmed} disabled={!complete} onChange={e=>setConfirmed(e.target.checked)}>我已确认地点和日期，标记到旅行地图</NeoCheckbox>
    {complete&&reconfirm&&!confirmed&&<p className="photo-editor-hint">地点或日期已更改，请重新确认。</p>}
    {!complete&&<p className="photo-editor-hint">缺少{[!d.country&&'国家',!d.prefecture&&'地区',!d.place.trim()&&'地点',!d.date&&'日期'].filter(Boolean).join('、')}，仍可保存为待整理照片。</p>}
   </section>
   <details className="photo-editor-more"><summary>查看更多<ChevronDown size={16}/></summary><div>
    <h3>从原图补读</h3><NeoButton type="button" onClick={()=>sourceInput.current?.click()}><FileImage size={17}/>读取地点与日期</NeoButton><p className="photo-editor-hint">原图仅在本机读取，请选择这张照片的原文件。</p>
    <h3>精确位置 <span>可选</span></h3><div className="photo-editor-two"><label>纬度<NeoInput type="number" step="any" min={-90} max={90} value={d.latitude===null?'':Number(d.latitude.toFixed(6))} onChange={e=>patch({latitude:e.target.value===''?null:Number(e.target.value)})}/></label><label>经度<NeoInput type="number" step="any" min={-180} max={180} value={d.longitude===null?'':Number(d.longitude.toFixed(6))} onChange={e=>patch({longitude:e.target.value===''?null:Number(e.target.value)})}/></label></div>
    {(d.latitude!==null||d.longitude!==null)&&<button type="button" className="quiet-link" onClick={()=>patch({latitude:null,longitude:null})}>清除坐标，只记地区</button>}
    {photo.metadata&&<><h3>相机信息</h3><dl>{Object.entries(photo.metadata).map(([key,value])=><div key={key}><dt>{{make:'品牌',model:'型号',lens:'镜头',aperture:'光圈',exposureSeconds:'曝光秒数',iso:'ISO',focalLength:'焦距'}[key]||key}</dt><dd>{String(value)}</dd></div>)}</dl></>}
   </div></details></fieldset>
   <input ref={sourceInput} hidden type="file" accept="image/*,.heic,.heif,.dng,.tif,.tiff,.raw,.cr2,.cr3,.nef,.arw,.raf,.rw2,.orf,.pef" onChange={e=>void readSource(e.target.files?.[0])}/>
  </div><footer className="photo-editor-footer">{error&&<NeoNotification tone="error">{error}</NeoNotification>}<NeoButton variant="primary" type="submit" loading={busy||reading} disabled={busy||reading||(reconfirm&&!confirmed)||(confirmed&&(d.latitude!==null||d.longitude!==null)&&!validCoordinate(d.latitude,d.longitude))}><Check size={18}/>{reading?'正在读取原图':reconfirm&&!confirmed?'确认地点与日期后保存':confirmed?'保存并标记地图':'保存照片信息'}</NeoButton></footer></form>
 </dialog>;
}
