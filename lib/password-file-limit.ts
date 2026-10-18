import {mkdir,open,readdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';

// Single host / shared persistent local directory only, never serverless storage.
// Exclusive file creation gives five atomic slots shared across Node processes;
// crashes consume a slot rather than leaving a lock that blocks future logins.
export async function admitFileAttempt(directory=process.env.PASSWORD_RATE_LIMIT_DIR||resolve('.local/login-rate-limit'),now=Date.now()){
  await mkdir(directory,{recursive:true,mode:0o700});
  const window=Math.floor(now/60000);
  const old=(await readdir(directory)).filter(name=>/^\d+-[0-4]\.slot$/.test(name)&&Number(name.split('-')[0])<window-1).slice(0,100);
  await Promise.all(old.map(name=>unlink(resolve(directory,name)).catch(e=>{if(e.code!=='ENOENT')throw e})));
  for(let slot=0;slot<5;slot++){
    try{const handle=await open(resolve(directory,`${window}-${slot}.slot`),'wx',0o600);await handle.close();return true;}
    catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
  }
  return false;
}
