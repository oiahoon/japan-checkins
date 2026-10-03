'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Check,Info,TriangleAlert,AlertCircle,X} from 'lucide-react';

export type NotificationTone='success'|'info'|'warning'|'error';
type Props={children:ReactNode;tone?:NotificationTone;placement?:'inline'|'floating';onDismiss?:()=>void;duration?:number;action?:{label:string;onClick:()=>void};className?:string};
export default function NeoNotification({children,tone='success',placement='inline',onDismiss,duration,action,className=''}:Props){
 const [paused,setPaused]=useState(false);
 const dismiss=useRef(onDismiss);dismiss.current=onDismiss;
 const delay=duration??(placement==='floating'&&(tone==='success'||tone==='info')?5000:0);
 // Timers restart for a new message, pause while reading or using an action,
 // and never dismiss errors automatically or move keyboard focus.
 useEffect(()=>{if(!delay||paused||!onDismiss)return;const timer=setTimeout(()=>dismiss.current?.(),delay);return()=>clearTimeout(timer)},[children,tone,delay,paused,!!onDismiss]);
 const Icon={success:Check,info:Info,warning:TriangleAlert,error:AlertCircle}[tone];
 return <div className={`neo-notification neo-notification--${tone} neo-notification--${placement} ${className}`} onPointerEnter={()=>setPaused(true)} onPointerLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false)}}>
  <span className="neo-notification-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8}/></span>
  <div className="neo-notification-body" role={tone==='error'?'alert':'status'} aria-atomic="true">{children}</div>
  {action&&<button type="button" className="neo-notification-action" onClick={action.onClick}>{action.label}</button>}
  {onDismiss&&<button type="button" className="neo-notification-close" aria-label="关闭通知" onClick={onDismiss}><X size={16} aria-hidden="true"/></button>}
 </div>;
}
