import {resolve} from 'node:path';
const file=process.argv.find(a=>a.startsWith('--env='))?.slice(6)||'.env.local';
try{process.loadEnvFile(resolve(file))}catch(e){if(e.code!=='ENOENT')throw Error('配置文件无法读取')}
// Only this short-lived diagnostic process opts in. It never reads journal rows or updates env files.
process.env.PHOTO_DELIVERY='imagekit';
const {checkImageKit}=await import('../lib/imagekit-check.ts');
const result=await checkImageKit();console.log(result.message);if(!result.ok)process.exitCode=1;
