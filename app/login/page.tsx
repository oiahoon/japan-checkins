import NeoNotification from '../ui/notification';
import Link from 'next/link';
import ThemeToggle from '../ui/theme-toggle';
import {NeoButton,NeoInput} from '../ui/neo';
import {authProvider,siteConfig,authConfig,passwordConfig} from '../../lib/self-host-config';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;let publicSite=false;try{publicSite=siteConfig().visibility==='public';}catch{}
  const github=authProvider()==='github';let loginReady=false;try{if(github)authConfig();else passwordConfig();loginReady=true;}catch{}
  return <main className="login-page"><section className="login-card"><ThemeToggle/><p className="login-kicker">旅の記録 · TRAVEL JOURNAL</p><h1>我的旅行足迹</h1><p>把照片里的记忆，留在自己的地图上。</p>{!loginReady&&<NeoNotification tone="info">登录尚未启用</NeoNotification>}{error&&<NeoNotification tone="error">{github?'登录未完成，请重试':'密码不正确，请重试'}</NeoNotification>}{github?<Link className="primary login-button" href="/api/auth/github">使用 GitHub 登录</Link>:<form action="/api/auth/password" method="post"><label>日志密码<NeoInput type="password" name="password" required autoComplete="current-password" maxLength={256}/></label><NeoButton variant="primary" type="submit" disabled={!loginReady}>进入旅行日志</NeoButton></form>}{publicSite&&<Link className="quiet-link" href="/">浏览公开地图</Link>}</section></main>;
}
