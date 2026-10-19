import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ASSETS,PERIODS,resolveAssetSymbol,periodStart,onOrBefore,calculate,trajectory,netReturn,fxAt} from '../src/engine.js';
const a=ASSETS.find(a=>a.symbol==='SPY');
assert.equal(ASSETS.filter(a=>a.group==='A-share ETFs').length,7);
assert.equal(ASSETS.filter(a=>a.group==='Hong Kong ETFs').length,4);
assert.ok(ASSETS.filter(a=>a.group==='A-share ETFs').every(a=>a.currency==='CNY'&&!a.foreign));
assert.ok(ASSETS.filter(a=>a.group==='Hong Kong ETFs').every(a=>a.currency==='HKD'&&a.foreign));
assert.equal(resolveAssetSymbol('3032.HK'),'3033.HK');
assert.equal(resolveAssetSymbol('SPY'),'SPY');
assert.equal(resolveAssetSymbol('UNKNOWN'),null);
const series={SPY:{points:[{d:'2023-12-29',c:100,a:90},{d:'2024-12-31',c:105,a:99}]},'CNY=X':{points:[{d:'2023-12-29',c:7,a:7},{d:'2024-12-31',c:7.7,a:7.7}]},'HKD=X':{points:[{d:'2023-12-29',c:7.8,a:7.8},{d:'2024-12-31',c:7.8,a:7.8}]}};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
assert.equal(periodStart('2024-03-31','1M'),'2024-02-29');
assert.equal(periodStart('2024-02-29','1Y'),'2023-02-28');
assert.equal(periodStart('2024-12-31','YTD'),'2023-12-31');
assert.equal(periodStart('2024-01-02','1W'),'2023-12-26');
assert.equal(onOrBefore(series.SPY.points,'2024-01-07'),null);
const r=calculate(a,series,'2024-12-31','YTD',{capital:1000000});
near(r.local,.1);near(r.price,.05);near(r.income,.05);near(r.currency,.1);near(r.gross,.21);near(r.tax,.042);near(r.net,.168);near(r.value,1168000);
near(r.price+r.income+r.fxContribution-r.tax,r.net);
near(calculate(a,series,'2024-12-31','YTD',{fx:false}).net,.08);
near(calculate(a,series,'2024-12-31','YTD',{tax:false}).net,.21);
near(netReturn(-.2,true,.2),-.2);
near(netReturn(.2,false,.2),.2);
near(fxAt('HKD','2024-12-31',series),7.7/7.8);
assert.ok(calculate(a,{},'2024-12-31','1Y').error);
assert.ok(calculate(a,series,'2024-12-31','5Y').error);
assert.ok(calculate(a,{SPY:series.SPY},'2024-12-31','YTD').error);
const t=trajectory(a,series,'2024-12-31','YTD',{capital:1000000});
near(t[0].v,1000000);near(t.at(-1).v,r.value);
const domestic={...a,currency:'CNY',foreign:false};
near(calculate(domestic,series,'2024-12-31','YTD').net,.1);
console.log('Return calculations passed: income, multiplicative FX, tax, losses, domestic exemption, missing data, date boundaries and chart/table agreement.');
const snapshot=JSON.parse(await readFile(new URL('../src/snapshot.json',import.meta.url),'utf8'));
assert.equal(Object.keys(snapshot).length,ASSETS.length+2);
for(const data of Object.values(snapshot)){
  assert.equal(data.source,'Yahoo Finance');
  assert.ok(data.points.length>1200||(data.historyWarning&&data.points.length>500));
  assert.ok(data.points.every((p,i)=>p.c>0&&p.a>0&&(i===0||p.d>data.points[i-1].d)));
}
const snapshotEnd=Object.values(snapshot).map(s=>s.latest).sort().at(-1);
let validResults=0,unavailableResults=0;
for(const asset of ASSETS)for(const period of PERIODS){
  const r=calculate(asset,snapshot,snapshotEnd,period);
  if(r.error){
    const data=snapshot[asset.symbol];
    assert.ok(data.historyWarning&&periodStart(snapshotEnd,period)<data.points[0].d,asset.symbol+' '+period+': '+r.error);
    unavailableResults++;continue;
  }
  assert.ok(Number.isFinite(r.value));
  near(r.price+r.income+r.fxContribution-r.tax,r.net);
  validResults++;
}
console.log(`Verified snapshot: all ${Object.keys(snapshot).length} series are ordered and valid; ${validResults} asset-period results reconcile; ${unavailableResults} documented history gaps show N/A.`);
