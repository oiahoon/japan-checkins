import {redirect,notFound} from 'next/navigation';
import {currentAccess} from '../../lib/github-auth';
import SetupCheck from './setup-check';
import './setup.css';
export const dynamic='force-dynamic';
export default async function Setup(){const access=await currentAccess();if(!access)redirect('/login');if(access.role!=='admin')notFound();return <SetupCheck/>;}
