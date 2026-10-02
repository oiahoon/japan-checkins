import {requireChatGPTUser} from './chatgpt-auth';
import {githubMode,siteConfig} from '../lib/self-host-config';
import {currentAccess} from '../lib/github-auth';
import {redirect} from 'next/navigation';
import Travel from './travel';
export const dynamic='force-dynamic';
export default async function Page(){
  if(!githubMode()){await requireChatGPTUser('/');return <Travel/>;}
  const access=await currentAccess();
  let publicSite=false;try{publicSite=siteConfig().visibility==='public';}catch{}
  if(!access&&!publicSite)redirect('/login');
  const storageReady=!!(process.env.GITHUB_DATA_REPOSITORY&&process.env.GITHUB_DATA_TOKEN);
  return <Travel github storageReady={storageReady} canManage={access?.role==='admin'} shared={!access}/>;
}
