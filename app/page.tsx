import {requireChatGPTUser} from './chatgpt-auth';
import {githubMode,siteConfig} from '../lib/self-host-config';
import {currentAccess} from '../lib/github-auth';
import {redirect} from 'next/navigation';
import Travel from './travel';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){
  if(!githubMode()){await requireChatGPTUser('/');return <Travel/>;}
  const access=await currentAccess();
  let publicSite=false;try{publicSite=siteConfig().visibility==='public';}catch{}
  if(!access&&!publicSite)redirect('/login');
  const storageReady=!!(process.env.GITHUB_DATA_REPOSITORY&&process.env.GITHUB_DATA_TOKEN);
  if(access?.role==='admin'&&!storageReady)redirect('/setup');
  const {view}=await searchParams;
  return <Travel initialView={access?.role==='admin'&&view==='photos'?'photos':'map'} github storageReady={storageReady} canManage={access?.role==='admin'} shared={!access}/>;
}
