import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {ASSETS,PERIODS,calculate} from '../src/engine.js';
import {loadPublishedData} from '../src/published-data.js';
import {refreshHistory,SYMBOLS} from './refresh-history.mjs';

const html=await readFile('dist/index.html','utf8');
new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
assert.ok(!html.includes('/*__CLIENT__*/')&&!html.includes('/*__MOSAIC_CSS__*/'));
assert.ok(html.includes('const STATIC_SITE = true;')&&html.includes('href="./favicon.svg"'));
assert.ok(!html.includes('fonts.googleapis.com')&&!html.includes('chatgpt.site'));
const bundle=JSON.parse(await readFile('dist/data/market.json','utf8'));
assert.equal(Object.keys(bundle.series).length,SYMBOLS.length);
let request;
const fetched=await loadPublishedData('https://zhang356.github.io/return-atlas-rmb/',true,async(url,options)=>{
  request={url:url.href,...options};return new Response(JSON.stringify(bundle));
});
assert.equal(request.url,'https://zhang356.github.io/return-atlas-rmb/data/market.json');
assert.equal(request.cache,'reload');assert.equal(fetched.schema,1);
await assert.rejects(()=>loadPublishedData('https://example.com/project/',false,async()=>new Response('missing',{status:404})),/已发布行情暂不可用/);
await assert.rejects(()=>loadPublishedData('https://example.com/project/',false,async()=>new Response('{}')),/格式无效/);
const previous=JSON.parse(await readFile('src/snapshot.json','utf8'));
const refreshed=await refreshHistory(previous,{loadHistory:async symbol=>{
  if(symbol==='BTC-USD')throw new Error('upstream offline');
  if(symbol==='SPY')return {...previous[symbol],currency:'CNY'};
  return structuredClone(previous[symbol]);
}});
assert.equal(refreshed.updated,SYMBOLS.length-2);
assert.deepEqual(new Set(refreshed.failures),new Set(['BTC-USD','SPY']));
for(const symbol of refreshed.failures){
  assert.ok(refreshed.series[symbol].stale);
  assert.equal(refreshed.series[symbol].latest,previous[symbol].latest);
  assert.equal(refreshed.series[symbol].fetchedAt,previous[symbol].fetchedAt);
  assert.deepEqual(refreshed.series[symbol].points,previous[symbol].points);
}
assert.equal(previous.SPY.stale,undefined);
const end=Object.values(bundle.series).map(s=>s.latest).sort().at(-1);
let valid=0,gaps=0;
for(const asset of ASSETS)for(const period of PERIODS){
  const result=calculate(asset,bundle.series,end,period);
  if(result.error){assert.ok(bundle.series[asset.symbol].historyWarning);gaps++;}
  else{assert.ok(Number.isFinite(result.net));valid++;}
}
console.log(`Pages checks passed: project-relative loading, reload, error handling, stale-data preservation, currency validation, ${valid} returns and ${gaps} documented history gaps.`);
