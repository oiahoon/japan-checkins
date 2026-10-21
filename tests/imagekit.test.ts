import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {ImageKitDelivery,imageKitConfig,signImageKitURL} from '../lib/imagekit.ts';
import {createPhotoDeliveryReader} from '../lib/photo-delivery.ts';
import {journalAPI} from '../lib/github-service.ts';
import {syntheticProvider,syntheticGit,syntheticImageKit,syntheticOwner} from './helpers/imagekit-fixture.ts';
import {parseEnv,prepareSetup,serializeEnv} from '../lib/setup-env.mjs';
const jpeg=await sharp({create:{width:120,height:80,channels:3,background:'#e0e0e0'}}).jpeg().withExif({IFD0:{Make:'Synthetic'}}).toBuffer();
const ref={id:'synthetic-photo-01',sha:'a'.repeat(40),variant:'original' as const};
test('ImageKit is opt-in; invalid/incomplete config cannot enable external delivery',()=>{
 const env={IMAGEKIT_URL_ENDPOINT:syntheticImageKit.endpoint,IMAGEKIT_PRIVATE_KEY:syntheticImageKit.privateKey,GITHUB_DATA_REPOSITORY:'synthetic/private',JOURNAL_OWNER_ID:syntheticOwner};assert.equal(imageKitConfig(env),null);assert.equal(imageKitConfig({...env,PHOTO_DELIVERY:'git'}),null);
 for(const x of [{PHOTO_DELIVERY:'imagekit'},{PHOTO_DELIVERY:'unknown'}, {PHOTO_DELIVERY:'imagekit',IMAGEKIT_PRIVATE_DELIVERY_CONFIRMED:'true',IMAGEKIT_URL_ENDPOINT:'http://localhost/key'}])assert.throws(()=>imageKitConfig({...env,...x}));
 assert.ok(imageKitConfig({...env,PHOTO_DELIVERY:'imagekit',IMAGEKIT_PRIVATE_DELIVERY_CONFIRMED:'true'}));
});
test('protection proof rejects public delivery; only synthetic pixels leave before proof',async()=>{
 const provider=syntheticProvider();provider.setProtected(false);const delivery=new ImageKitDelivery(syntheticImageKit,provider.read);assert.equal(await delivery.verify(),false);assert.equal(delivery.ticket(ref),null);let loaded=false;await delivery.mirror(ref,async()=>{loaded=true;return jpeg});assert.equal(loaded,false);assert.equal(provider.files.size,0);
});
test('private mirror strips metadata, deduplicates, scopes keys and signs 60-second byte-preserving delivery',async()=>{
 const provider=syntheticProvider(),delivery=new ImageKitDelivery(syntheticImageKit,provider.read);assert.equal(delivery.ticket(ref),null);assert.equal(await delivery.verify(),true);assert.equal(provider.denied(),2);assert.equal(provider.files.size,0);
 await Promise.all([delivery.mirror(ref,async()=>jpeg),delivery.mirror(ref,async()=>jpeg)]);assert.equal(provider.files.size,1);const file=[...provider.files.values()][0];assert.equal(file.private,true);const meta=await sharp(file.bytes).metadata();assert.equal(meta.exif,undefined);assert.equal(meta.width,120);
 const ticket=delivery.ticket(ref)!;assert.ok(ticket.url.includes('tr=orig-true'));assert.ok(ticket.expiresAt*1000>Date.now());assert.ok(ticket.expiresAt*1000<=Date.now()+60000);assert.ok(!ticket.url.includes(ref.id));assert.ok(!ticket.url.includes(ref.sha));const bytes=await(await provider.read(ticket.url)).arrayBuffer();assert.deepEqual(new Uint8Array(bytes),file.bytes);
 assert.equal((await provider.read(ticket.url.replace('orig-true','w-10'))).status,401);assert.equal((await provider.read(signImageKitURL(syntheticImageKit,delivery.path(ref),Math.floor(Date.now()/1000)-1))).status,401);
 const before=provider.uploads();await new ImageKitDelivery(syntheticImageKit,provider.read).mirror(ref,async()=>{throw Error('Existing mirror must not reread Git')});assert.equal(provider.uploads(),before+1); // New instance only verifies a synthetic canary.
 assert.notEqual(delivery.path(ref),new ImageKitDelivery({...syntheticImageKit,namespace:'2'.repeat(32)},provider.read).path(ref));
});
test('same reader handles JPEG default, signed delivery, CDN failure fallback and cancellation',async()=>{
 const provider=syntheticProvider(),delivery=new ImageKitDelivery(syntheticImageKit,provider.read);await delivery.mirror(ref,async()=>jpeg);const ticket=delivery.ticket(ref)!;let git=0,external=0;
 const read:typeof fetch=async(url,init)=>{if(String(url).startsWith('https:')){external++;assert.equal(init?.credentials,'omit');assert.equal(init?.referrerPolicy,'no-referrer');return provider.read(url,init)}if(String(url).includes('delivery=git')){git++;return new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}})}return Response.json(ticket)};
 const reader=createPhotoDeliveryReader(read);assert.ok((await reader('/api/photos/synthetic-photo-01',new AbortController().signal)).size);assert.equal(git,0);provider.setOffline(true);assert.equal((await reader('/api/photos/synthetic-photo-01',new AbortController().signal)).size,jpeg.length);assert.equal(git,1);assert.equal(external,2);
 const abort=new AbortController();abort.abort();await assert.rejects(createPhotoDeliveryReader(async()=>{throw new DOMException('cancelled','AbortError')})('/api/photos/synthetic-photo-01',abort.signal),{name:'AbortError'});
});
test('upload is saved to Git before warming; tickets enforce owner, visibility and removal',async()=>{
 const git=syntheticGit(),provider=syntheticProvider(),delivery=new ImageKitDelivery(syntheticImageKit,provider.read),tasks:(()=>Promise<void>)[]=[];
 const context={userId:syntheticOwner,origin:'https://journal.test',store:git.store,delivery,schedule:(work:()=>Promise<void>)=>{tasks.push(work)}};
 const upload=new Request('https://journal.test/api/photos',{method:'POST',headers:{origin:context.origin,'X-Upload-Id':ref.id},body:jpeg});assert.equal((await journalAPI(context,upload,'upload')).status,201);assert.equal(git.data().photos.length,1);assert.equal(provider.uploads(),0);await Promise.all(tasks.splice(0).map(work=>work()));assert.equal(provider.files.size,2);
 const request=new Request('https://journal.test/api/photos/'+ref.id+'?delivery=auto');const response=await journalAPI(context,request,'photo',ref.id);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(((await response.json()) as {delivery:string}).delivery,'imagekit');
 assert.equal((await journalAPI({...context,sharedOnly:true},request,'photo',ref.id)).status,404);assert.notEqual((await journalAPI({...context,userId:'other'},request,'photo',ref.id)).status,200);
 git.data().photos[0].removed=true;assert.equal((await journalAPI(context,request,'photo',ref.id)).status,404);git.data().photos[0].removed=false;git.setPrivate(false);assert.notEqual((await journalAPI(context,request,'photo',ref.id)).status,200);
});
test('ImageKit failure never fails a Git upload or read; disabling skips provider entirely',async()=>{
 const git=syntheticGit(),provider=syntheticProvider();provider.setOffline(true);const delivery=new ImageKitDelivery(syntheticImageKit,provider.read),tasks:(()=>Promise<void>)[]=[],context={userId:syntheticOwner,origin:'https://journal.test',store:git.store,delivery,schedule:(work:()=>Promise<void>)=>{tasks.push(work)}};
 assert.equal((await journalAPI(context,new Request('https://journal.test/api/photos',{method:'POST',headers:{origin:context.origin,'X-Upload-Id':ref.id},body:jpeg}),'upload')).status,201);await Promise.all(tasks.map(t=>t()));const request=new Request('https://journal.test/api/photos/'+ref.id+'?delivery=auto');assert.equal((await journalAPI(context,request,'photo',ref.id)).headers.get('content-type'),'image/jpeg');assert.equal((await journalAPI({...context,delivery:null},request,'photo',ref.id)).status,200);
});
test('setup preserves optional credentials, defaults Git and supports explicit rollback',async()=>{
 const first=await prepareSetup('');assert.equal(first.values.PHOTO_DELIVERY,'git');const setup=await prepareSetup(serializeEnv(first.values),{photoDelivery:'imagekit',imagekit:{endpoint:syntheticImageKit.endpoint,privateKey:syntheticImageKit.privateKey,confirmed:true}});assert.equal(parseEnv(serializeEnv(setup.deployment)).IMAGEKIT_PRIVATE_KEY,syntheticImageKit.privateKey);const rollback=await prepareSetup(serializeEnv(setup.values),{photoDelivery:'git'});assert.equal(rollback.values.PHOTO_DELIVERY,'git');assert.equal(rollback.values.IMAGEKIT_PRIVATE_KEY,syntheticImageKit.privateKey);
});
test('untrusted tickets never cause external requests and cancelled CDN reads never start Git fallback',async()=>{
 let external=0,git=0;const invalid=createPhotoDeliveryReader(async(url)=>{if(String(url).startsWith('https:')){external++;throw Error('Must not send')}if(String(url).includes('delivery=git')){git++;return new Response(jpeg)}return Response.json({delivery:'imagekit',url:'https://attacker.invalid/image.jpg',expiresAt:Math.floor(Date.now()/1000)+60})});assert.equal((await invalid('/api/photos/synthetic-photo-01',new AbortController().signal)).size,jpeg.length);assert.equal(external,0);assert.equal(git,1);
 const provider=syntheticProvider(),delivery=new ImageKitDelivery(syntheticImageKit,provider.read);await delivery.mirror(ref,async()=>jpeg);const ticket=delivery.ticket(ref)!,abort=new AbortController();git=0;
 const reader=createPhotoDeliveryReader(async(url,init)=>{if(String(url).startsWith('https:'))return new Promise<Response>((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});abort.abort()});if(String(url).includes('delivery=git'))git++;return Response.json(ticket)});
 await assert.rejects(reader('/api/photos/synthetic-photo-01',abort.signal),{name:'AbortError'});assert.equal(git,0);
});
test('scheduler failures cannot turn an already committed photo into a failed upload',async()=>{
 const git=syntheticGit(),delivery=new ImageKitDelivery(syntheticImageKit,syntheticProvider().read),context={userId:syntheticOwner,origin:'https://journal.test',store:git.store,delivery,schedule:()=>{throw Error('Synthetic scheduler failed')}};
 const response=await journalAPI(context,new Request('https://journal.test/api/photos',{method:'POST',headers:{origin:context.origin,'X-Upload-Id':ref.id},body:jpeg}),'upload');assert.equal(response.status,201);assert.equal(git.data().photos.length,1);
});
test('completed mirrors can renew an expired protection proof without rereading private pixels',async()=>{
 let now=Date.now();const provider=syntheticProvider(),delivery=new ImageKitDelivery(syntheticImageKit,provider.read,()=>now);await delivery.mirror(ref,async()=>jpeg);assert.ok(delivery.ticket(ref));now+=300001;assert.equal(delivery.ticket(ref),null);
 await delivery.mirror(ref,async()=>{throw Error('Mirror should be reused')});assert.ok(delivery.ticket(ref));
});
test('a missing cached CDN copy can be rebuilt after client fallback',async()=>{
 const provider=syntheticProvider(),delivery=new ImageKitDelivery(syntheticImageKit,provider.read);await delivery.mirror(ref,async()=>jpeg);provider.files.delete(delivery.path(ref));await delivery.mirror(ref,async()=>jpeg,true);assert.equal(provider.files.has(delivery.path(ref)),true);
});
test('slow but progressing CDN bodies remain usable; stalled bodies fall back to Git',async()=>{
 const ticket={delivery:'imagekit',url:'https://ik.imagekit.io/synthetic/travel-journal/'+('1'.repeat(32))+'/'+('a'.repeat(64))+'.jpg?ik-t='+String(Math.floor(Date.now()/1000)+60)+'&ik-s=synthetic',expiresAt:Math.floor(Date.now()/1000)+60};let git=0,stall=false;
 const reader=createPhotoDeliveryReader(async(url,init)=>{
  if(!String(url).startsWith('https:')){if(String(url).includes('delivery=git')){git++;return new Response(jpeg,{headers:{'content-type':'image/jpeg'}})}return Response.json(ticket)}
  const stream=new ReadableStream<Uint8Array>({start(controller){let n=0;const timer=setInterval(()=>{if(stall&&n)return;controller.enqueue(new Uint8Array([1,2,3]));if(++n===8){clearInterval(timer);controller.close()}},8);init?.signal?.addEventListener('abort',()=>{clearInterval(timer);controller.error(new DOMException('stall','AbortError'))},{once:true})}});
  return new Response(stream,{headers:{'content-type':'image/jpeg'}});
 },{idleMs:35});
 assert.equal((await reader('/api/photos/synthetic-photo-01',new AbortController().signal)).size,24);assert.equal(git,0);stall=true;assert.equal((await reader('/api/photos/synthetic-photo-01',new AbortController().signal)).size,jpeg.length);assert.equal(git,1);
});
