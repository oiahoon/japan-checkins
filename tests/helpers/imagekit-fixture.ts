import {createHmac,createHash} from 'node:crypto';
import {GitHubStore} from '../../lib/github-store.ts';
import {emptyJournal,type Journal} from '../../lib/travel-data.ts';
import type {ImageKitConfig} from '../../lib/imagekit.ts';
export const syntheticOwner='synthetic-owner',syntheticRepo='synthetic/private-fixture';
export const syntheticImageKit:ImageKitConfig={endpoint:'https://ik.imagekit.io/synthetic',privateKey:'private_synthetic_only_not_a_credential',namespace:'1'.repeat(32)};
export function syntheticProvider(){
 const files=new Map<string,{id:string;bytes:Uint8Array;private:boolean}>();let uploads=0,denied=0;let protectedMode=true,offline=false;
 const read:typeof fetch=async(input,init)=>{
  if(offline)throw Error('Synthetic offline');const url=new URL(String(input));
  if(url.hostname==='upload.imagekit.io'){
   if(init?.headers&&new Headers(init.headers).get('authorization')!=='Basic '+Buffer.from(syntheticImageKit.privateKey+':').toString('base64'))return new Response(null,{status:401});
   const form=init!.body as FormData;const path=String(form.get('folder'))+'/'+String(form.get('fileName')),file=form.get('file') as Blob,id='synthetic-file-'+(++uploads);files.set(path,{id,bytes:new Uint8Array(await file.arrayBuffer()),private:form.get('isPrivateFile')==='true'});return Response.json({fileId:id,filePath:path,isPrivateFile:form.get('isPrivateFile')==='true'});
  }
  if(url.hostname==='api.imagekit.io'&&init?.method==='DELETE'){for(const [key,f] of files)if(f.id===url.pathname.split('/').at(-1))files.delete(key);return new Response(null,{status:204})}
  if(url.hostname!=='ik.imagekit.io')throw Error('Unexpected synthetic host');
  const path=url.pathname.replace('/synthetic',''),file=files.get(path);const exp=url.searchParams.get('ik-t'),sig=url.searchParams.get('ik-s');let valid=false;
  if(exp&&sig){const clean=new URL(url);clean.searchParams.delete('ik-t');clean.searchParams.delete('ik-s');const signedPart=clean.href.slice(syntheticImageKit.endpoint.length+1)+exp;valid=createHmac('sha1',syntheticImageKit.privateKey).update(signedPart).digest('hex')===sig&&Number(exp)>Date.now()/1000;}
  if((protectedMode||file?.private)&&!valid){denied++;return new Response(null,{status:401})}
  if(!file)return new Response(null,{status:404});return new Response(init?.method==='HEAD'?null:new Uint8Array(file.bytes),{headers:{'Content-Type':'image/jpeg','Content-Length':String(file.bytes.length)}});
 };
 return {read,files,uploads:()=>uploads,denied:()=>denied,setProtected:(v:boolean)=>{protectedMode=v},setOffline:(v:boolean)=>{offline=v}};
}
export function syntheticGit(initial:Journal=emptyJournal(syntheticOwner)){
 let journal=structuredClone(initial),head='head0',tree='',sequence=0;const blobs=new Map<string,Buffer>(),commits=new Map<string,string>();let privateRepo=true,reads=0;
 const read:typeof fetch=async(input,init)=>{
  const path=new URL(String(input)).pathname.replace('/repos/'+syntheticRepo,''),body=init?.body?JSON.parse(String(init.body)):{};
  if(path==='')return Response.json({private:privateRepo});if(path.startsWith('/git/ref/'))return Response.json({object:{sha:head}});if(path.startsWith('/git/commits/'))return Response.json({tree:{sha:'tree'}});
  if(path==='/contents/travel/index.json')return Response.json({encoding:'base64',size:100,content:Buffer.from(JSON.stringify(journal)).toString('base64')});
  if(path==='/git/blobs'){const b=Buffer.from(body.content,'base64'),sha=createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');blobs.set(sha,b);return Response.json({sha})}
  if(path.startsWith('/git/blobs/')){reads++;const b=blobs.get(path.split('/').at(-1)!);return b?Response.json({encoding:'base64',size:b.length,content:b.toString('base64')}):new Response(null,{status:404})}
  if(path==='/git/trees'){tree=body.tree[0].content;return Response.json({sha:'tree1'})}
  if(path==='/git/commits'){const sha='commit'+(++sequence);commits.set(sha,tree);return Response.json({sha})}
  if(path.startsWith('/git/refs/')){head=body.sha;journal=JSON.parse(commits.get(head)!);return Response.json({object:{sha:head}})}throw Error('Unexpected Git endpoint');
 };
 return {newStore:()=>new GitHubStore({repository:syntheticRepo,branch:'main',token:'synthetic-only',ownerId:syntheticOwner},read),store:new GitHubStore({repository:syntheticRepo,branch:'main',token:'synthetic-only',ownerId:syntheticOwner},read),blobs,data:()=>journal,reads:()=>reads,setPrivate:(v:boolean)=>{privateRepo=v}};
}
