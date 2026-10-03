'use client';
import {useState} from 'react';
import type {PhotoMetadata} from '../lib/photo-metadata';
import {batchReview} from '../lib/photo-review';
type Item={key:string;url:string;file:File;metadata?:PhotoMetadata};
export default function PhotoSuggestions({items,onApply}:{items:Item[];onApply:(metadata:PhotoMetadata)=>void}){
 const [selected,setSelected]=useState('');const p=items.find(p=>p.key===selected)||items.find(p=>p.metadata?.gps||p.metadata?.date)||items[0],review=batchReview(items);
 if(!p)return null;const m=p.metadata;
 return <section className="photo-suggestions" aria-label="照片识别建议"><div className="photo-suggestions-heading"><strong>照片识别建议</strong><span>待你确认</span></div>{items.length>1&&<div className="suggestion-strip" aria-label="选择参考照片">{items.map((p,i)=><button type="button" key={p.key} aria-label={'参考照片 '+(i+1)} aria-pressed={p===items.find(v=>v.key===selected)||(!selected&&p.key===(items.find(v=>v.metadata?.gps||v.metadata?.date)||items[0]).key)} onClick={()=>setSelected(p.key)}><img src={p.url} alt=""/><span>{i+1}</span></button>)}</div>}<p>{m?.gps?'有照片定位，可填入地点建议':'未读取到定位：当前地区来自地图选择，并非照片识别，请手动核对'}</p><p>{m?.date?'拍摄日期：'+m.date:'未读取到拍摄日期，请填写实际到访日期'}</p>{(m?.gps||m?.date)&&<button className="suggestion-apply" type="button" onClick={()=>onApply(m!)}>填入这张照片的建议</button>}{m?.camera&&<details><summary>相机信息</summary><p>{[m.camera.make,m.camera.model,m.camera.lens].filter(Boolean).join(' · ')}</p></details>}{(review.distinctDates||review.separated)&&<p role="status" className="batch-warning">{review.distinctDates?'这些照片的拍摄日期不同。':''}{review.separated?'这些照片的定位相距超过 5 公里。':''}每张照片独立确认，不会自动合并到访。</p>}<small>仅填入建议，尚未确认或保存。{!m&&'恢复的草稿已去除 EXIF，可重新选择原图读取建议。'}</small></section>;
}
