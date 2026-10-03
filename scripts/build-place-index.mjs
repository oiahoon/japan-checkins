import {readFile,writeFile} from 'node:fs/promises';
// Names only; reuse the public map data and its documented source licenses.
const read=async name=>JSON.parse(await readFile(new URL('../public/'+name+'.json',import.meta.url))).features;
const entries=[];
const variants={'東':'东','岡':'冈','県':'县','児':'儿','島':'岛','宮':'宫','崎':'崎','長':'长','広':'广','愛':'爱','媛':'媛','埼':'埼','栃':'枥','茨':'茨','群':'群','馬':'马','岐':'岐','阜':'阜','静':'静','賀':'贺','徳':'德','鳥':'鸟','根':'根','潟':'潟','沢':'泽','豊':'丰','浜':'滨','倉':'仓','戸':'户','瀬':'濑','塚':'冢','郷':'乡','橋':'桥','鈴':'铃','條':'条','門':'门','関':'关','台':'台','野':'野','葉':'叶','桜':'樱','ヶ':'个','亀':'龟'};
const simplify=s=>[...s].map(c=>variants[c]||c).join('');
const aliases=name=>[...new Set([name,simplify(name),name.replace(/(?:都|府|県|省|市|町|村|区)$/,''),simplify(name).replace(/(?:都|府|县|省|市|町|村|区)$/,'')])].filter(s=>s.length>=2);
const add=(country,prefecture,city,name,level,extra=[])=>entries.push({country,prefecture,city,name,level,aliases:[...new Set([...aliases(name),...extra])]});
for(const f of await read('japan-simple'))add('JP',f.properties.name,'',f.properties.name,'region');
for(const f of await read('japan-cities'))add('JP',f.properties.prefecture,f.properties.name,f.properties.name,'city',({'福岡市':['福冈','Fukuoka','博多','博多区','博多駅','博多站'],'鹿児島市':['鹿儿岛','Kagoshima'],'熊本市':['Kumamoto'],'東京都':['Tokyo']}[f.properties.name]||[]));
for(const f of await read('china-simple'))add('CN',f.properties.name,'',f.properties.name,'region');
for(const f of await read('sichuan-cities'))add('CN','四川省',f.properties.name,f.properties.name,'city');
for(const f of await read('chengdu-districts'))add('CN','四川省','成都市',f.properties.name,'district');
for(const f of await read('world-simple'))if(!['JP','CN'].includes(f.properties.code))add(f.properties.code,f.properties.name,'',f.properties.name,'country');
add('JP','','','日本','country',['Japan']);add('CN','','','中国','country',['China']);
await writeFile(new URL('../public/place-index.json',import.meta.url),JSON.stringify(entries)+'\n');
console.log('Public place names:',entries.length);
