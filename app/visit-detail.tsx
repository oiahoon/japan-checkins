'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import SheetHeader from './ui/sheet-header';
export default function VisitDetail({children,onClose,footer}:{children:ReactNode;onClose:()=>void;footer?:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close()},[]);return <dialog ref={ref} className="visit-detail" aria-label="到访记录详情" onCancel={onClose}><SheetHeader id="visit-detail-title" title="旅行记忆" onClose={onClose} closeLabel="关闭记录详情"/><div className="visit-detail-scroll">{children}</div>{footer&&<footer className="visit-detail-footer">{footer}</footer>}</dialog>}
