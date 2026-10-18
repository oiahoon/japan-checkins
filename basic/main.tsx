/// <reference types="vite/client" />
import {createRoot} from 'react-dom/client';
import {lazy,Suspense,useState} from 'react';
import {LockKeyhole,ArrowRight} from 'lucide-react';
const Travel=lazy(()=>import('../app/travel'));
import {JournalTransportContext} from '../app/journal-transport';
import {BrowserJournal} from './client';
import {NeoButton,NeoInput} from '../app/ui/neo';
import ThemeToggle from '../app/ui/theme-toggle';
import NeoNotification from '../app/ui/notification';
import '../app/globals.css';import '../app/ui/neo.css';import '../app/ui/journal-layout.css';import '../app/ui/journal-timeline.css';import '../app/ui/journal-entries.css';import '../app/ui/map-explorer.css';import '../app/setup/setup.css';
try{document.documentElement.dataset.theme=localStorage.getItem('travel-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}
function Basic(){
 const [client,setClient]=useState<BrowserJournal|null>(null),[repository,setRepository]=useState(''),[token,setToken]=useState(''),[branch,setBranch]=useState('main'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function connect(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');let next:BrowserJournal|undefined;try{next=new BrowserJournal(repository.trim(),branch.trim(),token);await next.connect();setToken('');const ready=next;const disconnect=next.disconnect;next.disconnect=()=>{disconnect();setClient(null)};setClient(ready)}catch(e){next?.disconnect();setError(e instanceof Error?e.message:'连接未完成，请重试')}finally{setBusy(false)}}
 if(client)return <JournalTransportContext.Provider value={client}><Suspense fallback={<main className="login-page" role="status">正在打开旅行日志…</main>}><Travel github canManage initialView="photos"/></Suspense></JournalTransportContext.Provider>;
 return <main className="login-page"><section className="login-card"><ThemeToggle/><p className="login-kicker">TRAVEL JOURNAL · GITHUB</p><h1>我的旅行足迹</h1><p>连接自己的私有仓库，开始记录。</p><form onSubmit={connect}><label>私有数据仓库<NeoInput maxLength={200} placeholder="用户名/仓库名" value={repository} onChange={e=>setRepository(e.target.value)} autoCapitalize="none" spellCheck={false} required disabled={busy}/></label><label>连接令牌<NeoInput type="password" maxLength={4096} value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" required disabled={busy}/></label><details><summary>首次连接怎么准备</summary><p className="fine">创建 private 数据仓库并添加 README，再创建仅授权该仓库 Contents 读写的 fine-grained token。令牌只在当前页面内存中使用，刷新后需要重新连接。</p><a className="quiet-link" href="https://github.com/new" target="_blank" rel="noreferrer">创建自己的私有仓库</a><a className="quiet-link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">创建连接令牌</a><label>数据分支<NeoInput maxLength={100} value={branch} onChange={e=>setBranch(e.target.value)} disabled={busy}/></label></details>{error&&<NeoNotification tone="error">{error}</NeoNotification>}<NeoButton variant="primary" type="submit" loading={busy}><LockKeyhole size={17}/>连接私人日志<ArrowRight size={17}/></NeoButton></form><p className="fine">照片与记录直达 GitHub 私有仓库，不进入 Pages 或 Actions。</p></section></main>
}
const root=import.meta.hot?.data.root||createRoot(document.getElementById('root')!);if(import.meta.hot)import.meta.hot.data.root=root;root.render(<Basic/>);
