import type {Metadata} from 'next';
import './globals.css';
import './ui/neo.css';
import './ui/journal-layout.css';
import './ui/journal-timeline.css';
import './ui/journal-entries.css';
import './ui/map-explorer.css';
export const metadata:Metadata={title:'我的旅行足迹',description:'私人旅行与美食照片打卡',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{__html:"try{const t=localStorage.getItem('travel-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}"}}/>{children}</body></html>;}
