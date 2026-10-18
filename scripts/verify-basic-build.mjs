import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
const forbidden=/^(?:\.env(?:\..*)?|\.git|\.setup|\.local|node_modules|private-data|uploads|inbox|travel)$/;
let count=0;
async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(forbidden.test(entry.name))throw Error('静态产物包含不允许发布的文件或目录');const file=join(dir,entry.name);if(entry.isDirectory())await visit(file);else{count++;if(/\.(?:html|js|json|css|map|txt)$/.test(entry.name)){const text=await readFile(file,'utf8');if(/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{25,}/.test(text))throw Error('静态产物包含疑似GitHub令牌');for(const key of ['GITHUB_DATA_TOKEN','SESSION_SECRET','ADMIN_PASSWORD_HASH'])if(process.env[key]?.length>12&&text.includes(process.env[key]))throw Error('静态产物包含服务端凭据');}}}}
await visit('dist-basic');const html=await readFile('dist-basic/index.html','utf8');if(!html.includes('Content-Security-Policy')||!html.includes('journal-base'))throw Error('缺少静态安全或子路径配置');console.log(`静态产物检查通过：${count}个文件，无私人目录或凭据。`);
