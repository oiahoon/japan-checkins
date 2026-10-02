import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {hashPassword} from '../lib/password.ts';
let source;try{source=await readFile('.env.local','utf8');}catch{source=await readFile('.env.example','utf8');}
function value(key){const line=source.split('\n').find(x=>x.startsWith(key+'='));return line?line.slice(key.length+1).trim():'';}
function fill(key,next){if(value(key))return;const line=`${key}=${next}`;const regex=new RegExp(`^${key}=.*$`,'m');source=regex.test(source)?source.replace(regex,line):source+'\n'+line+'\n';}
fill('AUTH_PROVIDER','password');fill('JOURNAL_VISIBILITY','private');fill('APP_URL','http://localhost:3000');fill('JOURNAL_OWNER_ID','journal-owner');fill('SESSION_SECRET',randomBytes(32).toString('hex'));fill('GITHUB_DATA_BRANCH','main');
if(!value('ADMIN_PASSWORD_HASH')){
 await mkdir('.setup',{recursive:true,mode:0o700});const password=randomBytes(20).toString('base64url');
 await writeFile('.setup/admin-password.txt',password+'\n',{mode:0o600});fill('ADMIN_PASSWORD_HASH',await hashPassword(password));
 console.log('已生成管理密码：.setup/admin-password.txt（仅保存在本机，不会提交或上传）。');
}
fill('GITHUB_DATA_TOKEN','');await writeFile('.env.local',source,{mode:0o600});await chmod('.env.local',0o600);
console.log('已准备 .env.local。填写自己的私有数据仓库和受限 token 后运行 npm run dev。');
