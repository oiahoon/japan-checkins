import {GitHubStore,GitHubError} from '../lib/github-store.ts';
import {decodeBase64} from '../lib/base64.ts';
import {journalSchema,assertOwner,recordId,InputError} from '../lib/travel-data.ts';
import {journalProjection} from '../lib/journal-projection.ts';
import type {JournalTransport} from '../app/journal-transport';
const json=(data:unknown,status=200)=>Response.json(data,{status});
export class BrowserJournal implements JournalTransport{
 private config:{repository:string;branch:string;token:string;ownerId:string};
 private abort=new AbortController();private closed=false;
 private read:typeof fetch;
 private images=new Map<string,Promise<Blob>>();private urls=new Map<string,Promise<string>>();
 constructor(repository:string,branch:string,token:string,read:typeof fetch=fetch){
  if(!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository)||repository.length>200)throw Error('数据仓库请填写“用户名/仓库名”，不要填写完整网址');
  if(!/^\w[\w-]*$/.test(branch)||branch.length>100)throw Error('请检查数据分支名称；首次使用请保留 main');
  if(!token.trim()||token.length>4096||/[\r\n]/.test(token))throw Error('请填写有效的连接令牌，检查是否误复制了换行');
  this.read=(input,init)=>read(input,init);this.config={repository,branch,token:token.trim(),ownerId:'journal-owner'};
 }
 private transport:typeof fetch=async(input,init)=>{
  if(this.closed)throw Error('已断开连接');
  const url=new URL(String(input));if(url.origin!=='https://api.github.com'||!url.pathname.startsWith('/repos/'+this.config.repository+'/')&&url.pathname!=='/repos/'+this.config.repository)throw Error('连接只能访问选定的 GitHub 仓库');
  return this.read(input,{...init,redirect:'error',credentials:'omit',signal:AbortSignal.any([this.abort.signal,...(init?.signal?[init.signal]:[])])});
 };
 private store(){return new GitHubStore(this.config,this.transport)}
 private async connectData(){
  const root='https://api.github.com/repos/'+this.config.repository,headers={Authorization:'Bearer '+this.config.token,Accept:'application/vnd.github+json'};
  const r=await this.transport(root,{headers,signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error('无法连接仓库，请检查令牌选中的仓库、有效期和权限');const meta=await r.json() as {private:boolean};if(meta.private!==true)throw Error('请选择 private 数据仓库，不能将照片保存在公开仓库');
  const index=await this.transport(root+'/contents/travel/index.json?ref='+encodeURIComponent(this.config.branch),{headers,signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(index.ok){const file=await index.json() as {encoding:string;size:number;content:string};if(file.encoding!=='base64'||file.size>512*1024)throw Error('日志索引过大或无效');const journal=journalSchema.parse(JSON.parse(new TextDecoder().decode(decodeBase64(file.content))));assertOwner(journal,journal.owner);this.config.ownerId=journal.owner;}
  else if(index.status===403)throw Error('令牌能找到仓库，但不能读取照片记录。请检查该数据仓库的 Contents 只读权限、组织批准或 GitHub 请求额度');
  else if(index.status!==404)throw Error('无法读取日志，请检查仓库和分支');
  await this.store().read(this.config.ownerId);
 }
 async connect(){try{await this.connectData()}catch(e){if(e instanceof TypeError||e instanceof Error&&['AbortError','TimeoutError'].includes(e.name))throw Error('暂时无法连接 GitHub，请检查网络后重试');if(e instanceof GitHubError)throw Error(e.status===404?'找不到数据分支，请先在私有仓库创建 README':e.status===403?'请检查令牌权限或 GitHub 请求额度':'私有仓库暂时无法读取，请重试');throw e}}
 disconnect=()=>{this.closed=true;this.abort.abort();this.config.token='';for(const p of this.urls.values())void p.then(url=>URL.revokeObjectURL(url)).catch(()=>{});this.urls.clear();this.images.clear();};
 photo=(src:string)=>{
  let pending=this.images.get(src);if(pending)return pending;
  const id=src.split('/').at(-1)!.split('?')[0];recordId.parse(id);
  pending=this.store().photo(id,this.config.ownerId).then(bytes=>{if(!bytes)throw Error('照片不存在');return new Blob([bytes],{type:'image/jpeg'})}).catch(e=>{this.images.delete(src);throw e});this.images.set(src,pending);return pending;
 };
 photoURL=(src:string)=>{let pending=this.urls.get(src);if(!pending){pending=this.photo(src).then(blob=>{if(this.closed)throw Error('已断开连接');return URL.createObjectURL(blob)}).catch(e=>{this.urls.delete(src);throw e});this.urls.set(src,pending)}return pending};
 request=async(url:string,init?:RequestInit):Promise<Response>=>{
  if(this.closed)return json({error:'请重新连接仓库'},401);
  if(init?.method&&init.method!=='GET')return json({error:'基础版通过 Git 更新数据；网页编辑请使用服务端进阶版'},403);
  const method=init?.method||'GET',path=url.split('?')[0],owner=this.config.ownerId,store=this.store();
  try{
   if(path==='/api/places')return json({enabled:false,results:[]});
   if(path==='/api/checkins'&&method==='GET')return json(journalProjection(await store.read(owner)));
   const id=path.startsWith('/api/photos/')?recordId.parse(path.split('/').at(-1)):undefined;
   if(id&&method==='GET')return new Response(await this.photo(path),{headers:{'Content-Type':'image/jpeg'}});
   return json({error:'此操作需要进阶服务端版本'},400);
  }catch(e){return json({error:e instanceof GitHubError?(e.status===401?'连接已过期，请重新连接仓库':e.status===403?'没有写入权限或GitHub额度暂不可用':e.status===404?'仓库或分支不可访问，请检查设置':'GitHub暂不可用，请保留内容并重试'):e instanceof InputError?e.message:e instanceof Error&&/timeout|abort/i.test(e.name+' '+e.message)?'连接 GitHub 超时，请保留照片并重试':e instanceof TypeError?'网络连接失败，请保留照片并重试':'操作未完成，请检查输入、令牌权限或网络后重试'},e instanceof GitHubError?503:400)}
 };
}
