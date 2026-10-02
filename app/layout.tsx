import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'我的日本足迹',description:'私人旅行与美食照片打卡',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
