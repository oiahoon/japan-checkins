'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ChevronRight,Globe2,Search,X,Plus,Minus,LocateFixed,MapPin} from 'lucide-react';
import PuzzleLayer,{type PuzzleLayerProps} from './puzzle-layer';
import {featurePath,type MapFeature,type Scope,type GeographicVisit} from '../lib/geography';
import {createExplorerTree,projectEarth,fitCamera,clampCamera,zoomCamera,detailNodeAt,featureNode,explorerPath,nodeForArea,nodeForVisit,nodeBounds,visitInExplorerNode,hasExplorerHistory,searchExplorer,type MapCamera,type ExplorerNode,type ExplorerGeographies} from '../lib/map-explorer';

export type ExplorerRequest={scope:Scope;area?:string;nodeId?:string;revision:number};
type Props=PuzzleLayerProps&{geographies:ExplorerGeographies;request:ExplorerRequest;focusedVisit?:GeographicVisit;visits:GeographicVisit[];historical:Set<string>;historyScope:Scope;onContext:(node:ExplorerNode,path:ExplorerNode[])=>void;onVisit:(id:string)=>void;onNavigate:()=>void;extended?:boolean;japanDetailsStatus?:'idle'|'loading'|'error'|'ready';onJapanDetails?:()=>void;onRetryJapanDetails?:()=>void};
type Pointer={x:number;y:number;startX:number;startY:number};
export default function MapExplorer({geographies:g,request,focusedVisit,visits,historical,historyScope,onContext,onVisit,onNavigate,extended=true,japanDetailsStatus,onJapanDetails,onRetryJapanDetails,...puzzle}:Props){
 const [cityShards,setCityShards]=useState<Record<string,MapFeature[]>>({}),[districtShards,setDistrictShards]=useState<Record<string,MapFeature[]>>({}),[dataError,setDataError]=useState(false),[dataLoading,setDataLoading]=useState(false),[retry,setRetry]=useState(0);
 const tree=useMemo(()=>createExplorerTree({...g,chinaCities:Object.values(cityShards).flat(),chinaDistricts:Object.values(districtShards).flat()}),[g.japan,g.china,g.world,g.sichuan,g.chengdu,g.japanCities,g.chinaAdmin,cityShards,districtShards]);
 const pendingFit=useRef<string|null>(null);
 const container=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),searchInput=useRef<HTMLInputElement>(null),searchButton=useRef<HTMLButtonElement>(null),searchPanel=useRef<HTMLDivElement>(null),pathNav=useRef<HTMLElement>(null),lastFocus=useRef<string|undefined>(undefined);
 const [size,setSize]=useState({width:900,height:600}),[camera,setCamera]=useState<MapCamera>({x:138,y:-40,span:40}),[nodeId,setNodeId]=useState('japan'),[searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState(''),[hover,setHover]=useState(''),[dragging,setDragging]=useState(false);
 const aspect=size.height/size.width,cam=useRef(camera),active=useRef(nodeId),aspectRef=useRef(aspect),animation=useRef(0),initialized=useRef(false),requestRevision=useRef(-1);
 const pointers=useRef(new Map<number,Pointer>()),gesture=useRef<{camera:MapCamera;center:{x:number;y:number};distance:number;moved:boolean}|null>(null);
 const notify=useRef(onContext),lastAspect=useRef(aspect);notify.current=onContext;aspectRef.current=aspect;
 const node=tree.get(nodeId)||tree.get('japan')!,parent=node.parent?tree.get(node.parent):undefined;
 const preferred=node.children.length?node:parent&&parent.id!=='asia'?parent:node;
 let layer=preferred;while(!layer.features.length&&layer.parent)layer=tree.get(layer.parent)!;
 const fallback=node.hasBoundary===false;
 const children=layer.children.map(id=>tree.get(id)!).filter(Boolean);
 const path=explorerPath(tree,node.id),results=useMemo(()=>searchExplorer(tree,query).filter(n=>extended||n.country==='JP'||n.id==='japan'),[tree,query,extended]);
 const requestJapanDetails=useRef(onJapanDetails);requestJapanDetails.current=onJapanDetails;
 const needsJapanDetails=searchOpen||!!request.nodeId?.startsWith('jp-')&&!g.japanCities.length||node.id.startsWith('jp-pref:')||node.id.startsWith('jp-city:');
 useEffect(()=>{if(needsJapanDetails)requestJapanDetails.current?.()},[needsJapanDetails]);
 const japanLoading=needsJapanDetails&&japanDetailsStatus==='loading',japanError=needsJapanDetails&&japanDetailsStatus==='error';
 const project=projectEarth;
 function stop(){if(animation.current)cancelAnimationFrame(animation.current);animation.current=0;}
 // A delayed saved-city restore must yield when the user starts navigating.
 function takeControl(){pendingFit.current=null;requestRevision.current=request.revision;initialized.current=true;stop()}
 function update(next:MapCamera,semantic=true){if(semantic){pendingFit.current=null;setHover('');}const bounded=clampCamera(next);cam.current=bounded;setCamera(bounded);if(semantic){const n=detailNodeAt(tree,active.current,bounded,aspectRef.current);if(extended||n.country==='JP'){active.current=n.id;setNodeId(n.id);}}}
 function navigate(next:ExplorerNode,animate=true){
  stop();setSearchOpen(false);setHover('');pendingFit.current=next.country==='CN'?next.id:null;active.current=next.id;setNodeId(next.id);
  const target=fitCamera(next,aspectRef.current),start=cam.current;
  if(!animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){update(target,false);return;}
  const began=performance.now();const tick=(now:number)=>{const progress=Math.min(1,(now-began)/360),ease=1-Math.pow(1-progress,3);update({x:start.x+(target.x-start.x)*ease,y:start.y+(target.y-start.y)*ease,span:Math.exp(Math.log(start.span)+(Math.log(target.span)-Math.log(start.span))*ease)},false);if(progress<1)animation.current=requestAnimationFrame(tick);else {animation.current=0;setHover('');}};animation.current=requestAnimationFrame(tick);
 }
 useEffect(()=>{const el=container.current;if(!el)return;const resize=new ResizeObserver(([entry])=>{if(entry.contentRect.width&&entry.contentRect.height)setSize({width:entry.contentRect.width,height:entry.contentRect.height});});resize.observe(el);return()=>resize.disconnect();},[]);
 useEffect(()=>{if(!initialized.current||requestRevision.current!==request.revision){const n=request.nodeId?tree.get(request.nodeId):nodeForArea(tree,request.scope,request.area);if(n&&(n.features.length||n.frame)){requestRevision.current=request.revision;const first=!initialized.current;initialized.current=true;navigate(n,!first);}}},[tree,request.revision]);
 useEffect(()=>{if(initialized.current&&Math.abs(lastAspect.current-aspect)>.001){const n=tree.get(active.current)!;if(animation.current)navigate(n,false);else update({...cam.current,span:cam.current.span*fitCamera(n,aspect).span/fitCamera(n,lastAspect.current).span},false);}lastAspect.current=aspect;},[aspect]);
 useEffect(()=>{notify.current(node,explorerPath(tree,node.id));},[node]);
 useEffect(()=>{if(pathNav.current)pathNav.current.scrollLeft=pathNav.current.scrollWidth},[nodeId]);
 // Public geometry is loaded only for the country/province being explored.
 const provinceCode=node.country==='CN'?node.provinceCode:undefined;
 useEffect(()=>{
  if(node.country!=='CN'||!g.chinaAdmin){setDataLoading(false);setDataError(false);return}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let cancelled=false;
  const load=async()=>{setDataLoading(true);setDataError(false);try{
   const jobs:Promise<void>[]=[];
   if(provinceCode&&!cityShards[provinceCode])jobs.push(fetch('/china-cities/'+provinceCode+'.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('city layer');return r.json() as Promise<{features:MapFeature[]}>}).then(v=>{if(!cancelled)setCityShards(old=>({...old,[provinceCode!]:v.features}))}));
   if(provinceCode&&!districtShards[provinceCode])jobs.push(fetch('/china-districts/'+provinceCode+'.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('district layer');return r.json() as Promise<{features:MapFeature[]}>}).then(v=>{if(!cancelled)setDistrictShards(old=>({...old,[provinceCode]:v.features}))}));
   await Promise.all(jobs);
  }catch{if(!cancelled)setDataError(true)}finally{clearTimeout(timeout);if(!cancelled)setDataLoading(false)}};void load();
  return()=>{cancelled=true;clearTimeout(timeout);controller.abort()};
 },[node.country,provinceCode,retry,g.chinaAdmin]);
 useEffect(()=>{const id=pendingFit.current,n=id?tree.get(id):undefined;if(n&&n.hasBoundary!==false&&n.features.length){pendingFit.current=null;stop();update(fitCamera(n,aspectRef.current),false)}},[tree]);
 // A gesture may reach a province before its shard arrives. Reconcile its new geometry
 // at the same camera; only an explicit click/search is allowed to request a refit.
 useEffect(()=>{if(initialized.current&&!pendingFit.current&&!animation.current)update(cam.current);},[tree]);
 useEffect(()=>()=>stop(),[]);
 useEffect(()=>{if(!focusedVisit){lastFocus.current=undefined;return}if(lastFocus.current===focusedVisit.id)return;const n=nodeForVisit(tree,focusedVisit);if(!n)return;lastFocus.current=focusedVisit.id;stop();active.current=n.id;setNodeId(n.id);const fit=fitCamera(n,aspectRef.current);if(focusedVisit.latitude!=null&&focusedVisit.longitude!=null){const [x,y]=project([focusedVisit.longitude,focusedVisit.latitude]);update({x,y,span:Math.min(fit.span,2)},false);}else navigate(n);},[focusedVisit?.id,tree]);
 useEffect(()=>{const el=svg.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();takeControl();const r=el.getBoundingClientRect();update(zoomCamera(cam.current,Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.0025),aspectRef.current,{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}));};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[tree,extended,request.revision]);
 useEffect(()=>{if(!searchOpen)return;searchInput.current?.focus();const outside=(e:PointerEvent)=>{if(!searchPanel.current?.contains(e.target as Node)&&!searchButton.current?.contains(e.target as Node))setSearchOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[searchOpen]);
 function closeSearch(){setSearchOpen(false);searchButton.current?.focus();}
 function targetForFeature(f:ExplorerNode['features'][number]){return featureNode(tree,layer,f);}
 function selectRegion(id:string){const n=tree.get(id);if(n){takeControl();onNavigate();navigate(n);}}
 function zoom(factor:number){takeControl();update(zoomCamera(cam.current,factor,aspectRef.current));}
 function rebaseGesture(){const ps=[...pointers.current.values()],center={x:ps.reduce((a,p)=>a+p.x,0)/ps.length,y:ps.reduce((a,p)=>a+p.y,0)/ps.length};gesture.current={camera:cam.current,center,distance:ps.length>1?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0,moved:gesture.current?.moved||false};}
 function releasePointer(e:React.PointerEvent<SVGSVGElement>,cancel=false){
  const current=gesture.current,wasPinch=pointers.current.size>1;pointers.current.delete(e.pointerId);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  if(pointers.current.size){rebaseGesture();return;}
  setDragging(false);gesture.current=null;
  if(!cancel&&!wasPinch&&!current?.moved){const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-node],[data-area]');const id=hit?.getAttribute('data-node');if(id)selectRegion(id);else if(hit){const name=hit.getAttribute('data-puzzle-region'),sourceId=hit.getAttribute('data-puzzle-id');const n=layer.scope==='japan'?[...tree.values()].find(n=>n.country==='JP'&&n.city===name&&n.area===hit.getAttribute('data-area')&&String(n.features[0]?.properties.id)===sourceId):children.find(n=>n.name===name);if(n)selectRegion(n.id);}}
 }
 const regionalVisits=useMemo(()=>visits.filter(v=>visitInExplorerNode(v,layer)),[visits,layer]);
 const visibleVisits=regionalVisits.filter(v=>v.latitude!=null&&v.longitude!=null);
 const units=camera.span/size.width;
 const isRecorded=(n:ExplorerNode)=>visits.some(v=>visitInExplorerNode(v,n))||hasExplorerHistory(n,historyScope,historical);
 const entries=useMemo(()=>layer.features.map(f=>{const target=targetForFeature(f);return {feature:f,target,path:featurePath(f,project),recorded:isRecorded(target),bounds:nodeBounds({...target,frame:undefined,features:[f]})};}),[layer,tree,visits,historical,historyScope]);
 // Keep neighboring countries/provinces/cities reachable without first resetting the camera.
 const surroundings=useMemo(()=>extended&&layer.id!=='asia'?explorerPath(tree,layer.id).slice(0,-1).filter(n=>n.id!=='asia').flatMap((ancestor)=>{
  const ancestors=new Set(explorerPath(tree,layer.id).map(n=>n.id));
  return ancestor.features.flatMap(f=>{const target=featureNode(tree,ancestor,f);return ancestors.has(target.id)||target.id===ancestor.id?[]:[{id:ancestor.id+':'+f.properties.id,target,path:featurePath(f,project),bounds:nodeBounds({...target,frame:undefined,features:[f]})}]});
 }):[],[tree,layer,extended]);
 const inView=([l,t,r,b]:number[])=>r>=camera.x-camera.span/2&&l<=camera.x+camera.span/2&&b>=camera.y-camera.span*aspect/2&&t<=camera.y+camera.span*aspect/2;
 const labels=entries.flatMap(({feature:f,bounds:[l,t,r,b]})=>{const width=(r-l)/camera.span*size.width,height=(b-t)/(camera.span*aspect)*size.height,x=(l+r)/2,y=(t+b)/2;return width>65&&height>35&&Math.abs(x-camera.x)<camera.span*.47&&Math.abs(y-camera.y)<camera.span*aspect*.45?[{id:f.properties.id,name:f.properties.name,x,y}]:[];}).slice(0,24);
 const notesZoom=camera.span<8?3:1;
 return <div ref={container} className={'atlas map-explorer '+(dragging?'is-dragging':'')} data-map-level={node.id} data-map-span={camera.span.toFixed(4)}>
  <div className="atlas-vignette"/>
  <div className="explorer-navigation">
   {node.parent&&extended&&<button className="explorer-back" aria-label={'返回'+parent?.name} onClick={()=>selectRegion(node.parent!)}><ArrowLeft size={18}/></button>}
   <nav ref={pathNav} className="explorer-path" aria-label="地理层级路径">{path.filter(n=>extended||n.country==='JP').map((n,i,a)=><span key={n.id} className={i<a.length-2?'crumb-ancestor':''}><button aria-current={n.id===node.id?'location':undefined} aria-label={'前往'+n.name} onClick={()=>selectRegion(n.id)}>{n.id==='world'?<Globe2 size={18}/>:n.name}</button>{i<a.length-1&&<ChevronRight size={13} aria-hidden="true"/>}</span>)}</nav>
  </div>
  <button ref={searchButton} className="explorer-search-button" aria-label="搜索地区" aria-expanded={searchOpen} aria-controls="explorer-search" onClick={()=>setSearchOpen(v=>!v)}><Search size={19}/></button>
  {searchOpen&&<div ref={searchPanel} id="explorer-search" className="explorer-search" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeSearch();}}}><div className="explorer-search-field"><Search size={18}/><input ref={searchInput} aria-label="搜索国家、城市或地区" placeholder="国家、城市或区县" value={query} onChange={e=>setQuery(e.target.value)}/><button aria-label="关闭地区搜索" onClick={closeSearch}><X size={18}/></button></div><div className="explorer-search-results">{results.map(n=><button key={n.id} onClick={()=>{selectRegion(n.id);searchButton.current?.focus();}}><MapPin size={17}/><span><strong>{n.name}</strong><small>{explorerPath(tree,n.id).slice(0,-1).map(n=>n.name).join(' · ')}</small></span><ChevronRight size={16}/></button>)}{!results.length&&<p>没有匹配的地区</p>}</div></div>}
  <div className="explorer-zoom" aria-label="地图操作"><div><button aria-label="放大地图" disabled={camera.span<=.018} onClick={()=>zoom(1/1.45)}><Plus size={20}/></button><button aria-label="缩小地图" disabled={camera.span>=430} onClick={()=>zoom(1.45)}><Minus size={20}/></button></div><button aria-label="居中当前地区" onClick={()=>navigate(node)}><LocateFixed size={20}/></button></div>
  <svg ref={svg} className="explorer-canvas" viewBox={`${camera.x-camera.span/2} ${camera.y-camera.span*aspect/2} ${camera.span} ${camera.span*aspect}`} aria-label={node.name+'旅行地图'} tabIndex={0}
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;const step=cam.current.span*.12;if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Backspace'].includes(e.key)){e.preventDefault();takeControl();if(e.key==='+'||e.key==='=')zoom(1/1.45);else if(e.key==='-')zoom(1.45);else if(e.key==='Home')navigate(node);else if(e.key==='Backspace'&&node.parent&&extended)selectRegion(node.parent);else update({...cam.current,x:cam.current.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),y:cam.current.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)});}}}
   onPointerDown={e=>{if(e.button!==0)return;takeControl();setHover('');pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});e.currentTarget.setPointerCapture(e.pointerId);rebaseGesture();if(pointers.current.size>1)gesture.current!.moved=true;}}
   onPointerMove={e=>{const p=pointers.current.get(e.pointerId),state=gesture.current;if(!p||!state)return;p.x=e.clientX;p.y=e.clientY;const ps=[...pointers.current.values()],center={x:ps.reduce((a,p)=>a+p.x,0)/ps.length,y:ps.reduce((a,p)=>a+p.y,0)/ps.length},rect=e.currentTarget.getBoundingClientRect();const dx=center.x-state.center.x,dy=center.y-state.center.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>5||ps.length>1){state.moved=true;setDragging(true);}if(!state.moved)return;const distance=ps.length>1?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0;const zoomed=state.distance>0&&distance>0?zoomCamera(state.camera,state.distance/distance,aspectRef.current,{x:(state.center.x-rect.left)/rect.width,y:(state.center.y-rect.top)/rect.height}):state.camera;update({...zoomed,x:zoomed.x-dx/rect.width*zoomed.span,y:zoomed.y-dy/rect.height*zoomed.span*aspectRef.current});}}
   onPointerUp={e=>releasePointer(e)} onPointerCancel={e=>releasePointer(e,true)}>
   <g className="explorer-background">{surroundings.filter(f=>inView(f.bounds)).map(f=><path key={f.id} data-node={f.target.id} d={f.path} fillRule="evenodd" role="button" tabIndex={0} aria-label={'探索'+f.target.name} onPointerEnter={()=>{if(!animation.current)setHover(f.target.name)}} onPointerLeave={()=>setHover('')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectRegion(f.target.id);}}}><title>{f.target.name}</title></path>)}</g>
   <g key={layer.id} className="explorer-boundaries">{entries.filter(f=>inView(f.bounds)).map(({feature:f,target,path,recorded})=><path key={f.properties.id} data-node={target.id} d={path} fillRule="evenodd" className={'prefecture '+(target.id===node.id?'selected':recorded?'recorded':'')} role="button" tabIndex={0} aria-label={'探索'+f.properties.name} onPointerEnter={()=>{if(!animation.current)setHover(f.properties.name)}} onPointerLeave={()=>setHover('')} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectRegion(target.id);}}}><title>{f.properties.name}</title></path>)}</g>
   <PuzzleLayer {...puzzle} scope={layer.scope} puzzleFeatures={layer.scope==='japan'?(layer.id==='japan'?g.japanCities:layer.features):layer.features} puzzleVisits={regionalVisits} project={project} zoom={notesZoom} prefix="explorer-photo"/>
   <g className="explorer-labels" aria-hidden="true">{labels.map(l=><text key={l.id} x={l.x} y={l.y} style={{fontSize:units*12,strokeWidth:units*3}} textAnchor="middle">{l.name}</text>)}</g>
   {visibleVisits.map(v=>{const [x,y]=project([v.longitude!,v.latitude!]);return <g key={v.id} className="explorer-visit" transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={'查看打卡：'+v.place} onPointerDown={e=>e.stopPropagation()} onClick={()=>onVisit(v.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onVisit(v.id);}}}><title>{v.place}</title><circle r={units*22} fill="transparent"/>{v.id===focusedVisit?.id&&<circle className="explorer-visit-halo" r={units*15}/>}<circle r={units*5} className="explorer-visit-dot" strokeWidth={units*2}/></g>;})}
  </svg>
  {(dataLoading||dataError||japanLoading||japanError||fallback)&&<div className="explorer-coverage" role="status">{dataLoading||japanLoading?'正在载入地区地图…':japanError?<button onClick={onRetryJapanDetails}>城市地图载入失败 · 重试</button>:dataError?<button onClick={()=>setRetry(v=>v+1)}>地图载入失败 · 重试</button>:fallback?'暂显示'+layer.name+'地图':null}</div>}
  {hover&&!dragging&&<div className="explorer-hover" aria-hidden="true">{hover}</div>}
  <div className="explorer-footer">{visits.some(v=>v.place_source==='geoapify')&&<span className="explorer-geocoding-source"><a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a></span>}<div className="map-legend"><span><i className="amber-dot"/>选中</span><span><i className="teal-dot"/>已记录</span></div><a className="explorer-source" href={layer.scope==='chengdu'?'https://www.openstreetmap.org/copyright':'/data-notes.md'} target="_blank" rel="noreferrer">{layer.scope==='chengdu'||layer.features.some(f=>f.properties.year===2017)?'© OSM · 2017':layer.features.some(f=>f.properties.year===2021)?'内政部 · 2021':layer.features.some(f=>f.properties.year===2020)?'HDX · 2020':'地图来源'}</a></div>
  <span className="sr-only" role="status" aria-live="polite">当前地图：{path.map(n=>n.name).join('，')}</span>
 </div>;
}
