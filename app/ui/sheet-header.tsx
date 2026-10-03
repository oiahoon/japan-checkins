import type {ReactNode} from 'react';
import {X} from 'lucide-react';
export default function SheetHeader({id,title,description,onClose,closeLabel,disabled=false,className=''}:{id?:string;title:ReactNode;description?:ReactNode;onClose:()=>void;closeLabel:string;disabled?:boolean;className?:string}){
 return <header className={'journal-sheet-header '+className}><div><h2 id={id}>{title}</h2>{description&&<p>{description}</p>}</div><button className="icon-button" type="button" disabled={disabled} aria-label={closeLabel} onClick={onClose}><X size={20}/></button></header>;
}
