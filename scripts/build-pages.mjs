import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {validHistory,SYMBOLS} from './refresh-history.mjs';

const engine=await readFile('src/engine.js','utf8'),mosaic=await readFile('src/mosaic.js','utf8');
const loader=await readFile('src/published-data.js','utf8');
const mosaicCss=await readFile('src/mosaic.css','utf8');
const client='const STATIC_SITE = true;\n'+engine.replaceAll('export ','')+'\n'+mosaic.replaceAll('export ','')+'\n'+loader.replaceAll('export ','')+'\n'+await readFile('src/ui.js','utf8');
const html=(await readFile('src/page.html','utf8')).replace('/*__CLIENT__*/',()=>client).replace('/*__MOSAIC_CSS__*/',()=>mosaicCss);
const baseline=JSON.parse(await readFile('src/snapshot.json','utf8'));
let series;
try{series=JSON.parse(await readFile('.cache/history.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;series=Object.fromEntries(Object.entries(baseline).map(([s,d])=>[s,{...d,snapshot:true}]));}
for(const symbol of SYMBOLS)if(!validHistory(series[symbol],symbol))throw new Error('无效行情：'+symbol);
await rm('dist',{recursive:true,force:true});await mkdir('dist/data',{recursive:true});
await writeFile('dist/index.html',html);
await writeFile('dist/data/market.json',JSON.stringify({schema:1,generatedAt:new Date().toISOString(),dailyUpdates:process.env.AUTO_UPDATE_ENABLED==='true',series}));
await writeFile('dist/.nojekyll','');
await writeFile('dist/favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#135e4b"/><path d="M10 28V18h5v10m3 0V12h5v16m3 0V7h5v21" stroke="#e7f1ca" stroke-width="3" fill="none"/></svg>');
console.log('GitHub Pages 已构建，含 '+SYMBOLS.length+' 组行情。');
