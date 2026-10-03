import {redirect} from 'next/navigation';
import {currentAccess} from '../../lib/github-auth';
import {githubMode} from '../../lib/self-host-config';
import {requireChatGPTUser} from '../chatgpt-auth';
import Kit from './kit';
export const dynamic='force-dynamic';
export default async function Page(){if(githubMode()){const access=await currentAccess();if(!access)redirect('/login');if(access.role!=='admin')redirect('/');}else await requireChatGPTUser('/ui-kit');return <Kit/>;}
