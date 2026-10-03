import Link from 'next/link';
import ThemeToggle from '../ui/theme-toggle';
import {NeoButton,NeoInput} from '../ui/neo';
import {authProvider,siteConfig,authConfig,passwordConfig} from '../../lib/self-host-config';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;let publicSite=false;try{publicSite=siteConfig().visibility==='public';}catch{}
  const github=authProvider()==='github';let loginReady=false;try{if(github)authConfig();else passwordConfig();loginReady=true;}catch{}
  return <main className="login-page"><section className="login-card"><ThemeToggle/><p className="login-kicker">旅の記録 · TRAVEL JOURNAL</p><h1>我的旅行足迹</h1><p>把照片里的记忆，留在自己的地图上。</p><p className="fine">{github?'使用日志主人的 GitHub 账号登录。':'输入管理密码可记录旅行；访问密码仅用于浏览。'}</p>{!loginReady&&<p role="status">登录尚未启用，等待主人完成部署配置。</p>}{error&&<p role="alert">{github?'登录未完成，请确认 GitHub 账号后重试。':'密码不正确，请重试。'}</p>}{github?<Link className="primary login-button" href="/api/auth/github">使用 GitHub 登录</Link>:<form action="/api/auth/password" method="post"><label>日志密码<NeoInput type="password" name="password" required autoComplete="current-password" maxLength={256}/></label><NeoButton variant="primary" type="submit" disabled={!loginReady}>进入旅行日志</NeoButton></form>}{publicSite&&<Link className="quiet-link" href="/">浏览公开地图</Link>}</section></main>;
}
