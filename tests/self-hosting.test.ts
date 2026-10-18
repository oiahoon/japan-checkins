import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {prepareSetup,parseEnv,serializeEnv} from '../lib/setup-env.mjs';
import {siteConfig} from '../lib/self-host-config.ts';
import {admitFileAttempt} from '../lib/password-file-limit.ts';
import {productionRateLimitReady} from '../lib/password-rate-limit.ts';
const exec=promisify(execFile),isolated=()=>mkdtemp(join(tmpdir(),'travel-onboarding-'));
test('fresh setup generates independent credentials and only the selected deployment configuration',async()=>{
 const a=await prepareSetup('',{target:'vercel',repository:'synthetic/private'}),b=await prepareSetup('');assert.ok(a.password&&a.password.length>=12);assert.notEqual(a.values.SESSION_SECRET,b.values.SESSION_SECRET);assert.notEqual(a.values.ADMIN_PASSWORD_HASH,b.values.ADMIN_PASSWORD_HASH);assert.equal(a.deployment.APP_URL,undefined);assert.equal(a.deployment.PASSWORD_RATE_LIMIT,'');assert.equal(a.values.APP_URL,'http://localhost:3000');assert.equal(a.deployment.GITHUB_DATA_REPOSITORY,'synthetic/private');
 const repeat=await prepareSetup(serializeEnv(a.values));assert.equal(repeat.password,null);assert.equal(repeat.values.ADMIN_PASSWORD_HASH,a.values.ADMIN_PASSWORD_HASH);assert.equal(repeat.values.SESSION_SECRET,a.values.SESSION_SECRET);
 const v=await prepareSetup(serializeEnv(a.values),{target:'vercel',wafConfigured:true});assert.equal(v.deployment.PASSWORD_RATE_LIMIT,'vercel-waf');
 const s=await prepareSetup(serializeEnv(a.values),{target:'server',url:'https://synthetic.test'});assert.equal(s.deployment.PASSWORD_RATE_LIMIT,'file');assert.equal(s.deployment.APP_URL,'https://synthetic.test');await assert.rejects(prepareSetup('',{target:'server'}));await assert.rejects(prepareSetup('',{target:'invalid'}));
});
test('setup serialization preserves special characters without executing dotenv interpolation',async()=>{
 const values={GITHUB_DATA_TOKEN:'synthetic # token " with \\ chars',ADMIN_PASSWORD_HASH:'scrypt:example'};assert.deepEqual(parseEnv(serializeEnv(values)),values);
 const dir=await isolated();try{await writeFile(join(dir,'.env.example'),'UNRELATED="keep me"\n');await exec(process.execPath,['--experimental-strip-types',resolve('scripts/setup-selfhost.mjs'),'--target','local'],{cwd:dir});const first=await readFile(join(dir,'.env.local'),'utf8');assert.ok(first.includes('UNRELATED="keep me"'));assert.equal((await stat(join(dir,'.env.local'))).mode&0o777,0o600);assert.equal((await stat(join(dir,'.setup/admin-password.txt'))).mode&0o777,0o600);await exec(process.execPath,['--experimental-strip-types',resolve('scripts/setup-selfhost.mjs'),'--target','local'],{cwd:dir});assert.equal(await readFile(join(dir,'.env.local'),'utf8'),first);}finally{await rm(dir,{recursive:true,force:true})}
});
test('file limiter is atomic across processes, survives restart and renews each fixed minute',async()=>{
 const dir=await isolated();try{
 const script=`import {admitFileAttempt} from ${JSON.stringify(new URL('../lib/password-file-limit.ts',import.meta.url).href)};console.log(await admitFileAttempt(process.argv[1],60000));`;
 const values=await Promise.all(Array.from({length:12},()=>exec(process.execPath,['--experimental-strip-types','--input-type=module','-e',script,dir])));assert.equal(values.filter(v=>v.stdout.trim()==='true').length,5);assert.equal(await admitFileAttempt(dir,60000),false);assert.equal(await admitFileAttempt(dir,120000),true);await admitFileAttempt(dir,240000);assert.equal((await stat(join(dir,'4-0.slot'))).mode&0o777,0o600);
 const file=join(dir,'not-directory');await writeFile(file,'x');await assert.rejects(admitFileAttempt(file));
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('origin discovery trusts deployment configuration only and serverless cannot use local file limits',()=>{
 const names=['APP_URL','VERCEL','VERCEL_PROJECT_PRODUCTION_URL','SESSION_SECRET','PASSWORD_RATE_LIMIT','NODE_ENV'],saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{process.env.SESSION_SECRET='synthetic-secret-not-for-real-deployments';delete process.env.APP_URL;process.env.VERCEL='1';process.env.VERCEL_PROJECT_PRODUCTION_URL='synthetic.vercel.app';assert.equal(siteConfig().origin,'https://synthetic.vercel.app');process.env.APP_URL='https://custom.synthetic.test';assert.equal(siteConfig().origin,'https://custom.synthetic.test');Reflect.set(process.env,'NODE_ENV','production');process.env.PASSWORD_RATE_LIMIT='file';assert.equal(productionRateLimitReady(),false);delete process.env.VERCEL;assert.equal(productionRateLimitReady(),true);delete process.env.APP_URL;assert.throws(()=>siteConfig());}
 finally{for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}
});
