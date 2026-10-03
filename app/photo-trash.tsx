'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
export default function PhotoTrash({items,onRestore,onClose}:{items:{id:string;checkin:string}[];onRestore:(id:string)=>Promise<void>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);const [busy,setBusy]=useState(''),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 return <dialog ref={dialog} className="photo-trash" aria-labelledby="photo-trash-title" onCancel={onClose}><div className="sheet-header"><h2 id="photo-trash-title">照片回收站</h2><button aria-label="关闭照片回收站" onClick={onClose}><X/></button></div><p>移除只隐藏照片，原到访仍保留；照片文件和 Git 历史不会被永久删除。</p>{error&&<p role="alert">{error}</p>}{items.length?items.map((p,i)=><div className="trash-photo-row" key={p.id}><span>已移除照片 {i+1}</span><button disabled={!!busy} onClick={async()=>{setBusy(p.id);setError('');try{await onRestore(p.id)}catch(e){setError((e as Error).message)}finally{setBusy('')}}}>{busy===p.id?'正在恢复…':'恢复照片'}</button></div>):<p>回收站为空。</p>}</dialog>;
}
