import type {PhotoReadOptions,PhotoPriority} from './photo-source.ts';
type Consumer={priority:number;resolve:(b:Blob)=>void;reject:(e:unknown)=>void;clean:()=>void};
type Job={src:string;sequence:number;controller:AbortController;consumers:Set<Consumer>;running:boolean;background:boolean;paused:boolean};
const rank=(p:PhotoPriority='visible')=>p==='foreground'?2:p==='visible'?1:0;
const aborted=()=>new DOMException('Photo read cancelled','AbortError');
/** Page-memory only. Two passive reads leave a third lane for the current viewer. */
export class PhotoLoader{
 private jobs=new Map<string,Job>();private cache=new Map<string,Blob>();private urls=new Map<string,string>();
 private active=0;private passive=0;private sequence=0;private closed=false;
 private read:(src:string,signal:AbortSignal)=>Promise<Blob>;
 constructor(read:(src:string,signal:AbortSignal)=>Promise<Blob>){this.read=read}
 private priority(j:Job){return Math.max(-1,...[...j.consumers].map(c=>c.priority))}
 private pump(){
  if(this.closed)return;
  const foreground=[...this.jobs.values()].some(j=>j.consumers.size&&this.priority(j)>=2);
  if(foreground)for(const j of this.jobs.values())if(j.running&&j.consumers.size&&j.background&&this.priority(j)<2&&!j.paused){j.paused=true;j.controller.abort()}
  const waiting=[...this.jobs.values()].filter(j=>!j.running&&!j.controller.signal.aborted&&j.consumers.size).sort((a,b)=>this.priority(b)-this.priority(a)||a.sequence-b.sequence);
  for(const j of waiting){if(this.active>=3)break;const background=this.priority(j)<2;if(background&&(foreground||this.passive>=2))continue;
   j.running=true;j.background=background;this.active++;if(background)this.passive++;
   void Promise.resolve().then(()=>{if(j.controller.signal.aborted||this.closed)throw aborted();return this.read(j.src,j.controller.signal)}).then(blob=>{if(j.controller.signal.aborted||this.closed)throw aborted();this.cache.set(j.src,blob);const consumers=[...j.consumers];j.consumers.clear();for(const c of consumers){c.clean();c.resolve(blob)}}).catch(error=>{if(!j.paused){if(this.jobs.get(j.src)===j)this.jobs.delete(j.src);const consumers=[...j.consumers];j.consumers.clear();for(const c of consumers){c.clean();c.reject(error)}}}).finally(()=>{
    this.active--;if(j.background)this.passive--;
    if(j.paused&&!this.closed&&j.consumers.size&&this.jobs.get(j.src)===j){j.paused=false;j.running=false;j.controller=new AbortController()}
    else{j.consumers.clear();if(this.jobs.get(j.src)===j)this.jobs.delete(j.src)}
    this.pump();
   });
  }
 }
 blob(src:string,options:PhotoReadOptions={}):Promise<Blob>{
  if(this.closed||options.signal?.aborted)return Promise.reject(aborted());
  const cached=this.cache.get(src);if(cached)return Promise.resolve(cached);
  let j=this.jobs.get(src);if(!j||j.controller.signal.aborted&&!j.paused){j={src,sequence:this.sequence++,controller:new AbortController(),consumers:new Set(),running:false,background:true,paused:false};this.jobs.set(src,j)}const job=j;
  return new Promise<Blob>((resolve,reject)=>{const cancel=()=>{job.consumers.delete(c);c.clean();reject(aborted());if(!job.consumers.size){job.controller.abort();if(this.jobs.get(src)===job)this.jobs.delete(src)}this.pump()};const c:Consumer={priority:rank(options.priority),resolve,reject,clean:()=>options.signal?.removeEventListener('abort',cancel)};job.consumers.add(c);options.signal?.addEventListener('abort',cancel,{once:true});this.pump()});
 }
 async url(src:string,options:PhotoReadOptions={}){const blob=await this.blob(src,options);if(this.closed||options.signal?.aborted)throw aborted();let url=this.urls.get(src);if(!url){url=URL.createObjectURL(blob);this.urls.set(src,url)}return url}
 close(){this.closed=true;for(const j of this.jobs.values()){j.controller.abort();for(const c of j.consumers){c.clean();c.reject(aborted())}j.consumers.clear()}this.jobs.clear();for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();this.cache.clear()}
}
