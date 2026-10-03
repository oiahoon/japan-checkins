'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,MapPin,Check,ZoomIn,FileImage} from 'lucide-react';
import {NeoInput,NeoTextarea,NeoButton} from './ui/neo';
import NeoNotification from './ui/notification';
import SelectField from './select-field';
import SheetHeader from './ui/sheet-header';
import PhotoImage from './ui/photo-image';
import type {LibraryPhoto} from './photo-library';
import type {PhotoDetails} from '../lib/travel-data';
import {prefectureAt,type PhotoMetadata} from '../lib/photo-metadata';
import {inspectPhoto} from '../lib/photo-import';
import {editPlaceQuery,applyPlaceMatch,lookupPlace,type PlaceMatch} from '../lib/place-lookup';
import PlaceSearch from './place-search';
import {applySearchPlace} from '../lib/place-search';
import {photoSaveIntent} from '../lib/photo-save-intent';
import type {MapFeature} from '../lib/geography';
import {regionCities,cityDistricts,type ChinaDirectory} from '../lib/china-admin';
export default function PhotoEditor({photo,geos,onSave,onClose,onView}:{photo:LibraryPhoto;geos:{japan:MapFeature[];china:MapFeature[];sichuan:MapFeature[];world:MapFeature[];japanCities?:MapFeature[];chinaAdmin?:ChinaDirectory};onSave:(id:string,details:PhotoDetails,confirmed:boolean)=>Promise<void>;onClose:()=>void;onView:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),sourceInput=useRef<HTMLInputElement>(null),gpsApplied=useRef(false),placeEdited=useRef(false);
 const [d,setD]=useState<PhotoDetails>(()=>({...photo.details,date:photo.details.date||photo.proposal?.date||''})),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [localLoading,setLocalLoading]=useState(true),[localError,setLocalError]=useState(false);
 const [places,setPlaces]=useState<PlaceMatch[]>([]),[recovered,setRecovered]=useState<PhotoMetadata>(),[reading,setReading]=useState(false);
 useEffect(()=>{dialog.current?.showModal();let active=true;fetch('/place-index.json',{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error();return r.json() as Promise<PlaceMatch[]>}).then(entries=>{if(!active)return;if(!Array.isArray(entries))throw Error();setPlaces(entries);if(placeEdited.current)setD(v=>editPlaceQuery(v,v.place,entries))}).catch(()=>{if(active)setLocalError(true)}).finally(()=>{if(active)setLocalLoading(false)});return()=>{active=false}},[]);
 const patch=(value:Partial<PhotoDetails>)=>{
  const parentEdit=!('place' in value)&&['country','prefecture','city','district'].some(k=>k in value);if(parentEdit)placeEdited.current=false;
  setD(v=>{const next={...v,...value,...(!('placeSource' in value)&&Object.keys(value).some(k=>['country','prefecture','city','district','latitude','longitude'].includes(k))?{placeSource:undefined}:{})};
   const match=parentEdit?lookupPlace(v.place,places).automatic:undefined;
   if(match&&(match.country!==next.country||match.prefecture!==next.prefecture||match.city&&match.city!==next.city||match.district&&match.district!==next.district))next.place='';
   return next;
  });
 };
 const gps=recovered?.gps||photo.proposal?.gps;
 const gpsValue=useMemo(()=>{if(!gps)return;const jp=prefectureAt(gps.latitude,gps.longitude,geos.japan),cn=prefectureAt(gps.latitude,gps.longitude,geos.china),area=!jp&&!cn?geos.world.find(f=>prefectureAt(gps.latitude,gps.longitude,[f])):undefined;return {district:'',latitude:gps.latitude,longitude:gps.longitude,country:jp?'JP':cn?'CN':area?.properties.code||'',prefecture:jp||cn||area?.properties.name||'',city:jp?prefectureAt(gps.latitude,gps.longitude,(geos.japanCities||[]).filter(f=>(f.properties as {prefecture?:string}).prefecture===jp))||'':cn==='四川省'?prefectureAt(gps.latitude,gps.longitude,geos.sichuan)||'':''};},[gps,geos.japan,geos.china,geos.world,geos.sichuan,geos.japanCities]);
 useEffect(()=>{if(gpsApplied.current||!gpsValue||!geos.japan.length||!geos.world.length)return;gpsApplied.current=true;if(!photo.marked&&gpsValue.country&&!placeEdited.current)setD(v=>v.country?v:{...v,...gpsValue})},[gpsValue,geos.japan.length,geos.world.length,photo.marked]);
 const regionOptions=d.country==='JP'?geos.japan:d.country==='CN'?geos.china:[];
 const countryName=({JP:'日本',CN:'中国'} as Record<string,string>)[d.country]||geos.world.find(f=>f.properties.code===d.country)?.properties.name||d.country;
 const cityOptions=d.country==='CN'?regionCities(geos.chinaAdmin,d.prefecture):[];
 const districtOptions=d.country==='CN'?cityDistricts(geos.chinaAdmin,d.prefecture,d.city):[];
 const intent=photoSaveIntent(d,photo.marked);
 const dateMeta=recovered||photo.proposal;
 const dateHint=d.date===dateMeta?.date?(dateMeta?.dateSource==='digitized'?'来自照片数字化日期，请核对':dateMeta?.date?'来自照片拍摄日期':''):!d.date?(({missing:'原文件未提供 EXIF 日期',invalid:'EXIF 日期无效',error:'照片元数据读取失败'} as Record<string,string>)[dateMeta?.dateStatus||'']||'尚未读取到拍摄日期'):'';
 function chooseMatch(match:PlaceMatch){placeEdited.current=false;patch({...applyPlaceMatch(d,match),place:match.name,latitude:null,longitude:null,placeSource:undefined})}
 function changePlace(place:string){placeEdited.current=true;patch(editPlaceQuery(d,place,places))}
 async function readSource(file?:File){if(!file)return;setReading(true);setError('');try{const metadata=await inspectPhoto(file);setRecovered(metadata);if(metadata.date){patch({date:metadata.date})}else setError(metadata.dateStatus==='error'?'原图元数据读取失败':metadata.dateStatus==='invalid'?'原图日期无效，请手动填写':'原图未提供 EXIF 日期，请手动填写')}catch(e){setError((e as Error).message)}finally{setReading(false);if(sourceInput.current)sourceInput.current.value=''}}
 async function submit(){if(busy||reading||intent.error||(intent.confirmed&&localLoading&&placeEdited.current))return;setBusy(true);setError('');try{await onSave(photo.id,d,intent.confirmed);onClose()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <dialog ref={dialog} className="photo-editor" aria-labelledby="photo-editor-title" onCancel={e=>busy||reading?e.preventDefault():onClose()} onClose={onClose}>
  <SheetHeader className="photo-editor-header" id="photo-editor-title" title="这一张的记忆" description={photo.marked?'已保存 · 已标记地图':Object.values(photo.details).some(v=>typeof v==='string'&&v.trim())?'信息已保存 · 尚未标记地图':'已存入照片记录 · 可以稍后补充'} onClose={onClose} closeLabel="关闭照片编辑" disabled={busy||reading}/>
  <form onSubmit={e=>{e.preventDefault();void submit()}}><div className="photo-editor-scroll">
   <button type="button" className="photo-editor-preview" onClick={onView} aria-label="放大查看照片"><PhotoImage src={photo.url} alt="正在整理的照片" fit="contain" loading="eager"/><span><ZoomIn size={15}/>查看照片</span></button>
   <fieldset disabled={busy||reading}><section className="photo-editor-primary"><h3><MapPin size={17}/>在哪里，哪一天？</h3>
    <div className="photo-place-block"><PlaceSearch value={d.place} entries={places} loadingLocal={localLoading} localError={localError} onChange={changePlace} onLocal={chooseMatch} onSelect={m=>{placeEdited.current=false;patch(applySearchPlace(d,m,geos))}}/>
    <details className="photo-region-adjust" key={d.country?'located':'missing'} ><summary id="photo-place-region"><span>{d.country?[...new Set([countryName,d.prefecture,d.city,d.district].filter(Boolean))].join(' · '):'未选择所属地区'}<small>{d.country&&d.prefecture?'修改':'手动选择'}</small></span><ChevronDown size={16}/></summary><div className="photo-region-fields"><div className="photo-editor-two"><label>国家 / 地区<SelectField aria-label="照片国家" value={d.country} onChange={e=>patch({country:e.target.value,prefecture:'',city:'',district:'',latitude:null,longitude:null})}><option value="">待补充</option><option value="JP">日本</option><option value="CN">中国</option>{geos.world.filter(f=>!['JP','CN'].includes(f.properties.code||'')).map(f=><option key={f.properties.id} value={f.properties.code}>{f.properties.name}</option>)}</SelectField></label><label>地区{regionOptions.length?<SelectField aria-label="照片地区" value={d.prefecture} onChange={e=>patch({prefecture:e.target.value,city:'',district:'',latitude:null,longitude:null})}><option value="">待补充</option>{regionOptions.map(f=><option key={f.properties.id}>{f.properties.name}</option>)}</SelectField>:<NeoInput value={d.prefecture} placeholder="地区待补充" maxLength={50} onChange={e=>patch({prefecture:e.target.value,latitude:null,longitude:null})}/>}</label></div><label>城市{cityOptions.length?<SelectField aria-label="照片城市" value={d.city} onChange={e=>patch({city:e.target.value,district:'',latitude:null,longitude:null})}><option value="">待补充</option>{d.city&&!cityOptions.some(c=>c.name===d.city)&&<option>{d.city}</option>}{cityOptions.map(c=><option key={c.code}>{c.name}</option>)}</SelectField>:<NeoInput value={d.city} maxLength={100} placeholder="城市（可选）" onChange={e=>patch({city:e.target.value,district:'',latitude:null,longitude:null})}/>}</label>{(d.country==='CN'||!!d.district)&&<label>区 / 县{districtOptions.length?<SelectField aria-label="照片区县" value={d.district||''} onChange={e=>patch({district:e.target.value,latitude:null,longitude:null})}><option value="">待补充</option>{d.district&&!districtOptions.some(c=>c.name===d.district)&&<option>{d.district}</option>}{districtOptions.map(c=><option key={c.code}>{c.name}</option>)}</SelectField>:<NeoInput value={d.district||''} maxLength={100} placeholder="区县（可选）" onChange={e=>patch({district:e.target.value,latitude:null,longitude:null})}/>}</label>}</div></details>
    {gps&&(!photo.marked||recovered)&&(d.latitude!==gps.latitude||d.longitude!==gps.longitude)&&<button type="button" className="photo-proposal" onClick={()=>{if(gpsValue)patch({...gpsValue,placeSource:undefined})}}>使用照片定位建议</button>}
    </div>
    <label>日期<NeoInput type="date" value={d.date} onInput={e=>patch({date:e.currentTarget.value})} onChange={e=>patch({date:e.target.value})}/>{dateHint&&<small className="photo-date-hint">{dateHint}</small>}</label>
    <label>笔记 <span>可选</span><NeoTextarea rows={3} value={d.note} maxLength={1000} placeholder="那一刻，想留下什么？" onChange={e=>patch({note:e.target.value})}/></label>
   </section>
   <details className="photo-editor-more"><summary>查看更多<ChevronDown size={16}/></summary><div>
    <h3>从原图补读</h3><NeoButton type="button" onClick={()=>sourceInput.current?.click()}><FileImage size={17}/>读取地点与日期</NeoButton><p className="photo-editor-hint">原图仅在本机读取，请选择这张照片的原文件。</p>
    <h3>精确位置 <span>可选</span></h3><div className="photo-editor-two"><label>纬度<NeoInput type="number" step="any" min={-90} max={90} value={d.latitude===null?'':Number(d.latitude.toFixed(6))} onChange={e=>patch({latitude:e.target.value===''?null:Number(e.target.value)})}/></label><label>经度<NeoInput type="number" step="any" min={-180} max={180} value={d.longitude===null?'':Number(d.longitude.toFixed(6))} onChange={e=>patch({longitude:e.target.value===''?null:Number(e.target.value)})}/></label></div>
    {(d.latitude!==null||d.longitude!==null)&&<button type="button" className="quiet-link" onClick={()=>patch({latitude:null,longitude:null})}>清除坐标，只记地区</button>}
    {photo.metadata&&<><h3>相机信息</h3><dl>{Object.entries(photo.metadata).map(([key,value])=><div key={key}><dt>{{make:'品牌',model:'型号',lens:'镜头',aperture:'光圈',exposureSeconds:'曝光秒数',iso:'ISO',focalLength:'焦距'}[key]||key}</dt><dd>{String(value)}</dd></div>)}</dl></>}
   </div></details></fieldset>
   <input ref={sourceInput} hidden type="file" accept="image/*,.heic,.heif,.dng,.tif,.tiff,.raw,.cr2,.cr3,.nef,.arw,.raf,.rw2,.orf,.pef" onChange={e=>void readSource(e.target.files?.[0])}/>
  </div><footer className="photo-editor-footer">{error&&<NeoNotification tone="error">{error}</NeoNotification>}{intent.error&&<p className="photo-editor-hint" role="status">{intent.error}</p>}<NeoButton variant="primary" type="submit" loading={busy||reading} disabled={busy||reading||!!intent.error||(intent.confirmed&&localLoading&&placeEdited.current)}><Check size={18}/>{reading?'正在读取原图':intent.label}</NeoButton></footer></form>
 </dialog>;
}
