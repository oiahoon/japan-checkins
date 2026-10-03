'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
export default function ThemeToggle({onThemeChange}:{onThemeChange?:(dark:boolean)=>void}){const [dark,setDark]=useState(false);useEffect(()=>{setDark(document.documentElement.dataset.theme==='dark');},[]);function toggle(){const next=!dark;setDark(next);onThemeChange?.(next);document.documentElement.dataset.theme=next?'dark':'light';try{localStorage.setItem('travel-theme',next?'dark':'light');}catch{}}return <button className="theme-toggle" type="button" aria-label={dark?'切换浅色模式':'切换暗调模式'} aria-pressed={dark} onClick={toggle}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>;}
