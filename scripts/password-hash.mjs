import {hashPassword} from '../lib/password.ts';
async function readPassword(){
 if(!process.stdin.isTTY){let value='';for await(const chunk of process.stdin)value+=chunk;return value.replace(/\r?\n$/,'');}
 process.stderr.write('输入密码（隐藏输入，回车确认）：');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
 return new Promise((resolve,reject)=>{let value='';function finish(){process.stdin.setRawMode(false);process.stdin.pause();process.stdin.removeListener('data',onData);process.stderr.write('\n');}
 function onData(chunk){for(const c of chunk){if(c==='\u0003'){finish();reject(new Error('已取消'));return;}if(c==='\r'||c==='\n'){finish();resolve(value);return;}if(c==='\u007f'){value=value.slice(0,-1);}else if(c>=' ')value+=c;}}process.stdin.on('data',onData);});
}
try{process.stdout.write(await hashPassword(await readPassword())+'\n');}catch(e){console.error(e.message);process.exitCode=1;}
