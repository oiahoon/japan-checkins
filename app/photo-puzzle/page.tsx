import {redirect} from 'next/navigation';
import {currentAccess} from '../../lib/github-auth';
import {githubMode} from '../../lib/self-host-config';
import {requireChatGPTUser} from '../chatgpt-auth';
import {demoHtml} from './demo';
export const dynamic='force-dynamic';
export default async function Page(){
  if(githubMode()){const access=await currentAccess();if(!access)redirect('/login');if(access.role!=='admin')redirect('/');}
  else await requireChatGPTUser('/photo-puzzle');
  return <main><a href="/" style={{display:'block',padding:'12px 24px'}}>← 返回旅行地图 · 照片拼图体验</a><iframe title="日本照片拼图体验（随机示例）" srcDoc={demoHtml} sandbox="allow-scripts" style={{display:'block',width:'100%',height:'calc(100dvh - 48px)',border:0}}/></main>;
}
