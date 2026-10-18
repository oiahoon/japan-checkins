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
 const ready=!busy&&!error&&checks.length>0&&checks.every(c=>c.ok);
 return <main className="setup-page"><section className="setup-card"><header><div><p className="login-kicker">TRAVEL JOURNAL</p><h1>{ready?'你的旅行日志已就绪':'准备好，记录下一段旅行'}</h1></div><ThemeToggle/></header><p className="setup-intro">检查登录和自己的私有仓库。检查过程不会写入照片或记录。</p><ol className="setup-steps" aria-label="首次使用步骤"><li>配置</li><li aria-current="step">检查连接</li><li>添加照片</li></ol><div aria-live="polite" aria-busy={busy}>{busy?<p className="setup-loading">正在检查…</p>:checks.map(c=><div key={c.id} className="setup-check"><span className={'setup-icon '+(c.ok?'is-ready':'')}>{c.ok?<Check size={19}/>:<TriangleAlert size={19}/>}</span><div><h2>{c.label}</h2><p>{c.message}</p></div></div>)}</div>{error&&<NeoNotification tone="error">{error}</NeoNotification>}<footer><NeoButton loading={busy} onClick={()=>setAttempt(v=>v+1)}><RefreshCw size={16}/>重新检查</NeoButton>{ready?<a className="neo-button neo-button--primary" href="/?view=photos">添加第一张照片<ArrowRight size={17}/></a>:<a className="quiet-link" href="/">返回地图</a>}</footer>{!ready&&!busy&&<details><summary>如何修改配置</summary><p>在部署平台修改环境变量后重新部署；自有服务器更新环境文件后重启。也可以运行 <code>npm run doctor -- --remote</code> 查看检查结果。</p></details>}</section></main>;
}
