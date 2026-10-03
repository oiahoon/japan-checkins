import type {PuzzlePhoto} from './photo-puzzle.ts';
type Options={signal:AbortSignal;read:(url:string,signal:AbortSignal)=>Promise<Blob>;encode:(blob:Blob,signal:AbortSignal)=>Promise<string>;onProgress?:(done:number,total:number)=>void;requestMs?:number;budgetMs?:number;maxBytes?:number};
// Limit parallel authenticated reads and total embedded bytes; failed exports never silently omit photos.
export async function loadPosterPhotos(items:PuzzlePhoto[],options:Options):Promise<PuzzlePhoto[]>{
 const {signal,read,encode,onProgress}=options,controller=new AbortController(),result:PuzzlePhoto[]=new Array(items.length),unique=[...new Map(items.map(p=>[p.id,p])).values()];let cursor=0,done=0,bytes=0;
 if(unique.length>100)throw Error('照片较多，请选择旅行记录或缩小时间范围');
 onProgress?.(0,unique.length);
 const abort=()=>controller.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 const budget=setTimeout(()=>controller.abort(new Error('照片读取超时，请重试')),options.budgetMs??45000),urls=new Map<string,string>();
 async function worker(){while(cursor<unique.length){const p=unique[cursor++],request=new AbortController(),stop=()=>request.abort(controller.signal.reason);controller.signal.addEventListener('abort',stop,{once:true});if(controller.signal.aborted)stop();
 const timer=setTimeout(()=>request.abort(new Error('照片读取超时，请重试')),options.requestMs??15000);
 try{request.signal.throwIfAborted();const blob=await read(p.url,request.signal);request.signal.throwIfAborted();if(blob.type!=='image/jpeg'||blob.size>3*1024*1024)throw Error('照片格式或大小无效');bytes+=blob.size;if(bytes>(options.maxBytes??24*1024*1024))throw Error('照片较多，请选择旅行记录或缩小时间范围');urls.set(p.id,await encode(blob,request.signal));request.signal.throwIfAborted();onProgress?.(++done,unique.length);
 }finally{clearTimeout(timer);controller.signal.removeEventListener('abort',stop)}}}
 try{await Promise.all([worker(),worker()]);items.forEach((p,i)=>{result[i]={...p,url:urls.get(p.id)!}});return result;}catch(e){controller.abort(e);throw e;}finally{clearTimeout(budget);signal.removeEventListener('abort',abort)}
}
export function encodePosterPhoto(blob:Blob,signal:AbortSignal):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();const abort=()=>{reader.abort();reject(signal.reason||new DOMException('已取消','AbortError'))};const clean=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});reader.onload=()=>{clean();resolve(String(reader.result))};reader.onerror=()=>{clean();reject(Error('照片读取失败，请重试'))};reader.onabort=clean;if(signal.aborted){abort();return}reader.readAsDataURL(blob)})}
