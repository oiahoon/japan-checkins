import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {prepareSetup,parseEnv,serializeEnv} from '../lib/setup-env.mjs';
const {values:args}=parseArgs({options:{target:{type:'string'},repository:{type:'string'},url:{type:'string'},interactive:{type:'boolean'},'token-stdin':{type:'boolean'},'waf-configured':{type:'boolean'},'photo-delivery':{type:'string'}}});
let source;try{source=await readFile('.env.local','utf8')}catch{source=await readFile('.env.example','utf8')}
const current=parseEnv(source),options={target:args.target||'local',photoDelivery:args['photo-delivery'],repository:args.repository,url:args.url,wafConfigured:args['waf-configured']===true};
if(args['token-stdin']){let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>4096)throw Error('令牌输入过长')}options.token=input.trim();}
else if(args.interactive||(process.stdin.isTTY&&!args.target)){
 let muted=false;
 const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done()}});
 const rl=createInterface({input:process.stdin,output,terminal:true});
 try{
  const choice=await rl.question('部署到哪里？1 Vercel · 2 自有服务器 · 3 本机 [1]：');options.target=({'1':'vercel','2':'server','3':'local'})[choice.trim()||'1'];if(!options.target)throw Error('请选择 1、2 或 3');
  options.repository=(await rl.question(`私有数据仓库 owner/repository${current.GITHUB_DATA_REPOSITORY?' [保留现有]':''}：`)).trim()||current.GITHUB_DATA_REPOSITORY;
  if(!current.GITHUB_DATA_TOKEN){process.stdout.write('数据仓库令牌（输入隐藏）：');muted=true;options.token=(await rl.question('')).trim();muted=false;process.stdout.write('\n');}
  if(options.target==='server')options.url=(await rl.question('正式 HTTPS 地址：https://')).trim().replace(/^https:\/\//,'');
  if(options.target==='server')options.url='https://'+options.url;
  const imageChoice=(await rl.question(`图片加速（可选）1 ${current.PHOTO_DELIVERY==='imagekit'?'保留 ImageKit':'Git 默认'} · 2 配置 ImageKit · 3 关闭加速 [1]：`)).trim()||'1';
  if(imageChoice==='3')options.photoDelivery='git';
  else if(imageChoice==='2'){
   const endpoint=(await rl.question('ImageKit URL endpoint（https://ik.imagekit.io/你的账户）：')).trim();
   process.stdout.write('ImageKit private key（输入隐藏，留空保留已有）：');muted=true;const key=(await rl.question('')).trim()||current.IMAGEKIT_PRIVATE_KEY||'';muted=false;process.stdout.write('\n');
   const confirmed=(await rl.question('已在 ImageKit 开启 Restrict all requests？输入 yes 确认：')).trim()==='yes';
   options.photoDelivery='imagekit';options.imagekit={endpoint,privateKey:key,confirmed};
  }else if(imageChoice!=='1')throw Error('请选择 1、2 或 3');

 }finally{muted=false;rl.close();}
}
try{
 const result=await prepareSetup(source,options);
 await mkdir('.setup',{recursive:true,mode:0o700});await chmod('.setup',0o700);
 if(result.password)await writeFile('.setup/admin-password.txt',result.password+'\n',{mode:0o600});
 // Preserve unrelated local configuration; only append missing or explicitly changed values.
 const previous=parseEnv(source);for(const [key,value] of Object.entries(result.values))if(previous[key]!==value){const line=serializeEnv({[key]:value}).trimEnd(),re=new RegExp(`^${key}=.*$`,'m');source=re.test(source)?source.replace(re,()=>line):source+'\n'+line+'\n';}
 await writeFile('.env.local',source,{mode:0o600});await chmod('.env.local',0o600);
 const file=`.setup/${result.target}.env`;await writeFile(file,serializeEnv(result.deployment),{mode:0o600});await chmod(file,0o600);
 console.log('配置已准备。管理密码仅保存在 .setup/admin-password.txt；不会输出或提交凭据。');
 console.log(`部署配置：${file}（可一次导入；请勿提交或分享）。`);
 console.log(result.target==='vercel'?'下一步：导入配置 → 配置登录 WAF（每 IP 每分钟 5 次）→ 部署 → 打开 /setup 检查。':result.target==='server'?'下一步：在服务器载入 server.env，HTTPS 反向代理到 npm run start；.local 目录需持久可写。':'填写私有仓库与令牌后：npm run doctor -- --remote，然后 npm run dev。');
}catch(e){console.error(e.message);process.exitCode=1}
