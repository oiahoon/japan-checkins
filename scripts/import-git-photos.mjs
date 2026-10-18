import {parseArgs} from 'node:util';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {planGitImport,planThumbnailBackfill,GitImportJSONError} from '../lib/git-import.ts';
const exec=promisify(execFile);
try{
 const {values}=parseArgs({options:{'thumbnails-only':{type:'boolean'},'repository-root':{type:'string'},repository:{type:'string'}}});
 if(!values['repository-root']||!values.repository||!/^\w[\w-]*\/[\w.-]+$/.test(values.repository))throw Error('Provide repository-root and repository');
 const root=resolve(values['repository-root']),remote=(await exec('git',['remote','get-url','origin'],{cwd:root})).stdout.trim();
 if(![`https://github.com/${values.repository}`,`https://github.com/${values.repository}.git`,`git@github.com:${values.repository}.git`].includes(remote))throw Error('Repository remote mismatch');
 let meta;const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
 if(token){const r=await fetch('https://api.github.com/repos/'+values.repository,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Private repository verification failed');meta=await r.json()}
 else meta=JSON.parse((await exec('gh',['api','repos/'+values.repository],{timeout:20000,maxBuffer:1024*1024})).stdout);
 if(meta.private!==true)throw Error('Data repository must remain private');
 const plan=values['thumbnails-only']?await planThumbnailBackfill(root):await planGitImport(root,fileURLToPath(new URL('../public',import.meta.url))),temporary=[];
 try{for(const [path,bytes] of plan.writes){const destination=resolve(root,path),file=destination+'.import-tmp';await mkdir(dirname(file),{recursive:true});await writeFile(file,bytes,{flag:'wx',mode:0o600});temporary.push({file,destination})}for(const item of temporary)await rename(item.file,item.destination)}finally{await Promise.all(temporary.map(item=>rm(item.file,{force:true})))}
 console.log(`${values['thumbnails-only']?'Thumbnail backfill':'Import'} ready: ${plan.added} new photos / derivatives, ${plan.photos} total photos, ${plan.visits} confirmed visits, ${plan.writes.size} changed files. No Git commit was made by this command.`);
}catch(error){if(error instanceof GitImportJSONError)console.error(`导入未完成：${error.file} 不是有效 JSON，请检查英文引号、逗号和括号；本次未提交生成结果。`);else console.error('Import failed; no commit was made. Check private-repo access, manifest/owner, image format, region confirmation and batch limits. Do not publish private logs or metadata.');process.exitCode=1}
