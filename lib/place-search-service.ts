import {placeQuery,parsePlaceResults} from './place-search.ts';

const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
// Supplemental per-instance budget. Deployer/provider quotas still govern distributed traffic.
const windows=new Map<string,{time:number;count:number}>();
export function admitPlaceSearch(owner:string,now=Date.now()){
 for(const [key,value]of windows)if(now-value.time>=60000)windows.delete(key);
 const current=windows.get(owner)||{time:now,count:0};if(current.count>=30)return false;
 current.count++;windows.set(owner,current);return true;
}
async function boundedJSON(response:Response){
 if(Number(response.headers.get('content-length'))>131072)throw Error();
 const reader=response.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let size=0;
 for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>131072){await reader.cancel();throw Error()}chunks.push(part.value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function searchPlaces(request:Request,context:{access:{userId:string;role:'admin'|'viewer'}|null;origin:string;apiKey?:string;fetcher?:typeof fetch;admit?:(owner:string)=>boolean}){
 if(!context.access)return json({error:'请先登录'},401);
 if(context.access.role!=='admin')return json({error:'只读访问不能搜索私人照片地点'},403);
 if(request.method==='GET')return json({enabled:!!context.apiKey,provider:context.apiKey?'geoapify':null});
 if(request.method!=='POST')return json({error:'请求无效'},405);
 if(request.headers.get('origin')!==context.origin)return json({error:'无效请求来源'},403);
 let query:string;try{
  if(Number(request.headers.get('content-length'))>2000)throw Error();
  const reader=request.body?.getReader();if(!reader)throw Error();let size=0,body='';const decoder=new TextDecoder();
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2000){await reader.cancel();throw Error()}body+=decoder.decode(part.value,{stream:true})}body+=decoder.decode();query=placeQuery.parse(JSON.parse(body)).query;
 }catch{return json({error:'请输入 2–150 个字的地点关键词'},400)}
 if(!context.apiKey)return json({enabled:false,results:[]});
 if(!(context.admit||admitPlaceSearch)(context.access.userId))return json({error:'搜索过于频繁，请稍后再试'},429);
 const url=new URL('https://api.geoapify.com/v1/geocode/autocomplete');
 url.search=new URLSearchParams({text:query,format:'json',lang:'zh',limit:'6',apiKey:context.apiKey}).toString();
 try{
  const response=await (context.fetcher||fetch)(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)});
  if(!response.ok)return json({error:'地点搜索暂时不可用'},response.status===429?429:503);
  return json({enabled:true,results:parsePlaceResults(await boundedJSON(response))});
 }catch{return json({error:'地点搜索暂时不可用'},503)}
}
