import type {ReactNode} from 'react';
export default function PageHeader({title,description,eyebrow,actions}:{title:string;description?:string;eyebrow?:string;actions?:ReactNode}){
 return <header className="journal-page-header"><div className="journal-page-heading">{eyebrow&&<p className="journal-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description&&<p className="journal-page-description">{description}</p>}</div>{actions&&<div className="journal-page-actions">{actions}</div>}</header>;
}
