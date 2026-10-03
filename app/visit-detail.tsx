'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export default function VisitDetail({children,onClose}:{children:ReactNode;onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close()},[]);return <dialog ref={ref} className="visit-detail" aria-label="到访记录详情" onCancel={onClose}><header><span>旅行记忆</span><button className="icon-button" aria-label="关闭记录详情" onClick={onClose}><X size={20}/></button></header><div className="visit-detail-scroll">{children}</div></dialog>}
