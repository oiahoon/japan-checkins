'use client';
import {useEffect,useState} from 'react';
import {Check,TriangleAlert,ArrowRight,RefreshCw} from 'lucide-react';
import {NeoButton} from '../ui/neo';
import NeoNotification from '../ui/notification';
import ThemeToggle from '../ui/theme-toggle';
import type {DeploymentCheck} from '../../lib/deployment-check';
export default function SetupCheck(){
 const [checks,setChecks]=useState<DeploymentCheck[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const abort=new AbortController();let cancelled=false;setBusy(true);setError('');const timeout=setTimeout(()=>abort.abort(),60000);
  fetch('/api/setup/check',{method:'POST',signal:abort.signal}).then(async r=>{if(r.status===401){location.assign('/login');return;}if(!r.ok)throw Error('检查未完成，请重试。');const d=await r.json() as {checks:DeploymentCheck[]};if(!cancelled)setChecks(d.checks)}).catch(e=>{if(!cancelled)setError(e.name==='AbortError'?'连接超时，请检查网络后重试。':'检查未完成，请重试。')}).finally(()=>{clearTimeout(timeout);if(!cancelled)setBusy(false)});
  return()=>{cancelled=true;clearTimeout(timeout);abort.abort()};
 },[attempt]);
 const [kvBusy,setKVBusy]=useState(false),[kvResult,setKVResult]=useState<{ok:boolean;message:string}|null>(null);
 async function verifyKV(){
  setKVBusy(true);setKVResult(null);
  try{const r=await fetch('/api/setup/kv-check',{method:'POST',signal:AbortSignal.timeout(60000)});if(r.status===401){location.assign('/login');return;}const data=await r.json() as {ok?:boolean;message?:string};setKVResult({ok:r.ok&&data.ok===true,message:data.message||'检查未完成，请重新登录或稍后重试。'});}
  catch{setKVResult({ok:false,message:'连接超时或检查未完成，请稍后重试。'})}finally{setKVBusy(false)}
 }
 const [imageBusy,setImageBusy]=useState(false),[imageResult,setImageResult]=useState<{ok:boolean;message:string}|null>(null);
 async function verifyImages(){setImageBusy(true);setImageResult(null);try{const r=await fetch('/api/setup/imagekit-check',{method:'POST',signal:AbortSignal.timeout(60000)});if(r.status===401){location.assign('/login');return;}const data=await r.json() as {ok?:boolean;message?:string};setImageResult({ok:r.ok&&data.ok===true,message:data.message||'验证未完成，继续使用 Git。'})}catch{setImageResult({ok:false,message:'验证超时，照片继续从 Git 读取。'})}finally{setImageBusy(false)}}
 const ready=!busy&&!error&&checks.length>0&&checks.every(c=>c.ok||c.optional);
 return <main className="setup-page"><section className="setup-card"><header><div><p className="login-kicker">TRAVEL JOURNAL</p><h1>{ready?'你的旅行日志已就绪':'准备好，记录下一段旅行'}</h1></div><ThemeToggle/></header><p className="setup-intro">检查登录和自己的私有仓库。检查过程不会写入照片或记录。</p><ol className="setup-steps" aria-label="首次使用步骤"><li>配置</li><li aria-current="step">检查连接</li><li>添加照片</li></ol><div aria-live="polite" aria-busy={busy}>{busy?<p className="setup-loading">正在检查…</p>:checks.map(c=><div key={c.id} className="setup-check"><span className={'setup-icon '+(c.ok?'is-ready':'')}>{c.ok?<Check size={19}/>:<TriangleAlert size={19}/>}</span><div><h2>{c.label}</h2><p>{c.message}</p></div></div>)}</div>{error&&<NeoNotification tone="error">{error}</NeoNotification>}<details className="setup-kv"><summary>可选：加速照片加载</summary><p>默认使用 Git，不需要图床。要启用 ImageKit，运行 <code>npm run setup</code> 选择图片加速，或在部署平台配置以下服务端环境变量后重新部署。</p><ul><li><code>PHOTO_DELIVERY=imagekit</code></li><li><code>IMAGEKIT_URL_ENDPOINT</code> 与 <code>IMAGEKIT_PRIVATE_KEY</code></li><li>在 ImageKit 开启 <strong>Restrict all requests</strong>，然后设置 <code>IMAGEKIT_PRIVATE_DELIVERY_CONFIRMED=true</code>。</li></ul><p>此验证只上传一张合成色块，检查签名保护并尝试清理；不读取或上传旅行照片。关闭加速：设置 <code>PHOTO_DELIVERY=git</code> 并重新部署。失败自动回退 Git。</p><NeoButton loading={imageBusy} disabled={busy||imageBusy} onClick={verifyImages}>验证私有图片加速</NeoButton>{imageResult&&<NeoNotification tone={imageResult.ok?'success':'error'}>{imageResult.message}</NeoNotification>}</details><details className="setup-kv"><summary>验证 Redis 写入锁</summary><p>仅创建本项目命名空间内的随机测试键，最迟60秒到期。不写入照片或旅行记录；会使用少量共享 Redis 命令额度。</p><NeoButton loading={kvBusy} disabled={busy||kvBusy} onClick={verifyKV}>验证 Redis 写入锁</NeoButton>{kvResult&&<NeoNotification tone={kvResult.ok?'success':'error'}>{kvResult.message}</NeoNotification>}</details><footer><NeoButton loading={busy} onClick={()=>setAttempt(v=>v+1)}><RefreshCw size={16}/>重新检查</NeoButton>{ready?<a className="neo-button neo-button--primary" href="/?view=photos">添加第一张照片<ArrowRight size={17}/></a>:<a className="quiet-link" href="/">返回地图</a>}</footer>{!ready&&!busy&&<details><summary>如何修改配置</summary><p>在部署平台修改环境变量后重新部署；自有服务器更新环境文件后重启。也可以运行 <code>npm run doctor -- --remote</code> 查看检查结果。</p></details>}</section></main>;
}
