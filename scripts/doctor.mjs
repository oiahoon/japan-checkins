import {resolve} from 'node:path';
const argv=process.argv.slice(2),file=argv.find(a=>a.startsWith('--env='))?.slice(6)||'.env.local';
try{process.loadEnvFile(resolve(file))}catch(e){if(e.code!=='ENOENT')throw Error('配置文件无法读取')}
const {deploymentChecks}=await import('../lib/deployment-check.ts');
const checks=await deploymentChecks(argv.includes('--remote'));
if(argv.includes('--json'))console.log(JSON.stringify(checks));else for(const c of checks)console.log(`${c.ok?'✓':'×'} ${c.label}：${c.message}`);
if(checks.some(c=>!c.ok))process.exitCode=1;
