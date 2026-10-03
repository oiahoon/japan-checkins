'use client';
import {useEffect,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {NeoButton,NeoInput} from '../ui/neo';
export default function PasswordForm({ready}:{ready:boolean}){
 const [visible,setVisible]=useState(false),[pending,setPending]=useState(false);
 useEffect(()=>{const reset=()=>setPending(false);window.addEventListener('pageshow',reset);return()=>window.removeEventListener('pageshow',reset)},[]);
 return <form action="/api/auth/password" method="post" onSubmit={()=>setPending(true)}>
  <label htmlFor="journal-password">日志密码</label><div className="login-password-field"><NeoInput id="journal-password" type={visible?'text':'password'} name="password" required autoComplete="current-password" maxLength={256} disabled={!ready}/><NeoButton className="login-password-toggle" aria-label={visible?'隐藏密码':'显示密码'} aria-pressed={visible} disabled={!ready||pending} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</NeoButton></div>
  <NeoButton variant="primary" type="submit" loading={pending} disabled={!ready}>进入旅行日志</NeoButton>
 </form>;
}
