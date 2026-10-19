import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {returnMosaic} from '../src/mosaic.js';
import {ASSETS,PERIODS,calculate} from '../src/engine.js';
const data=JSON.parse(await readFile(new URL('../src/snapshot.json',import.meta.url),'utf8'));
assert.deepEqual(returnMosaic([],900,500),[]);
const zeros=returnMosaic([{net:0},{net:0},{net:null}],900,500);
assert.ok(zeros.every(r=>Number.isFinite(r.area)&&r.w>0&&r.h>0));
for(const period of PERIODS)for(const width of [800,1100,1400]){
  const items=ASSETS.map(a=>({symbol:a.symbol,net:calculate(a,data,'2026-10-16',period).net}));
  const height=1440,rects=returnMosaic(items,width,height);
  assert.equal(rects.length,items.length);
  assert.ok(Math.abs(rects.reduce((sum,r)=>sum+r.w*r.h,0)-width*height)<.01);
  for(let i=0;i<rects.length;i++){
    const a=rects[i];
    assert.ok(a.w>0&&a.h>0&&a.x>=-.001&&a.y>=-.001&&a.x+a.w<=width+.001&&a.y+a.h<=height+.001);
    for(let j=i+1;j<rects.length;j++){
      const b=rects[j];
      assert.ok(a.x+a.w<=b.x+.001||b.x+b.w<=a.x+.001||a.y+a.h<=b.y+.001||b.y+b.h<=a.y+.001,'Tiles must not overlap');
      if(Math.abs(a.net)>Math.abs(b.net))assert.ok(a.area>=b.area,'Larger absolute returns must get larger tiles');
    }
  }
}
console.log('Mosaic geometry passed for every holding period: area, ranking, bounds, non-overlap and zero/missing returns.');
