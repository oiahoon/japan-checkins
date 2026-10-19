import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const original=JSON.parse(await readFile(root+'public/japan-cities.json','utf8'));
const prefectures=JSON.parse(await readFile(root+'public/japan-simple.json','utf8')).features;
await mkdir(root+'public/japan-cities',{recursive:true});
const index={prefectures:[],cities:[]};
for(const p of prefectures){
 const features=original.features.filter(f=>f.properties.prefecture===p.properties.name),code=String(p.properties.id).padStart(2,'0');
 if(!features.length)throw Error('Missing prefecture');
 const text=JSON.stringify({type:'FeatureCollection',features})+'\n';
 await writeFile(root+'public/japan-cities/'+code+'.json',text);
 index.prefectures.push({id:p.properties.id,name:p.properties.name,code,count:features.length,bytes:Buffer.byteLength(text)});
 for(const f of features)index.cities.push([f.properties.id,f.properties.name,p.properties.id,f.properties.municipalityCode||'']);
}
if(index.cities.length!==original.features.length)throw Error('Unassigned municipality');
await writeFile(root+'lib/japan-city-catalog.json',JSON.stringify(index)+'\n');
console.log('Generated 47 public shards and a names-only municipality catalog; geometry unchanged.');
