import {scrypt, randomBytes, timingSafeEqual} from 'node:crypto';
const cost={N:131072,r:8,p:1,maxmem:256*1024*1024};
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,cost,(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string) {
  if(password.length<12||password.length>256)throw new Error('密码需要 12–256 个字符');
  const salt=randomBytes(16).toString('hex');
  return `scrypt:131072:8:1:${salt}:${(await derive(password,salt)).toString('hex')}`;
}
export function validPasswordHash(hash:string){return /^scrypt:131072:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);}
export async function verifyPassword(password:string,hash:string) {
  if(!validPasswordHash(hash)||password.length>256)return false;
  const [, , , ,salt,key]=hash.split(':');
  return timingSafeEqual(await derive(password,salt),Buffer.from(key,'hex'));
}
