import {ASSETS} from '../src/engine.js';
import {getHistory} from '../src/market-data.js';

export const SYMBOLS=[...ASSETS.map(a=>a.symbol),'CNY=X','HKD=X'];
export function validHistory(data,symbol) {
  return data?.symbol===symbol&&data.source==='Yahoo Finance'&&Number.isFinite(Date.parse(data.fetchedAt))&&
    data.points?.length>=2&&data.latest===data.points.at(-1).d&&
    data.points.every((p,i)=>/^\d{4}-\d{2}-\d{2}$/.test(p.d)&&Number.isFinite(p.c)&&p.c>0&&Number.isFinite(p.a)&&p.a>0&&(!i||p.d>data.points[i-1].d));
}
export async function refreshHistory(previous,{loadHistory=getHistory,concurrency=4,report=()=>{}}={}) {
  const series={},failures=[];let cursor=0,updated=0;
  async function consumer(){
    while(cursor<SYMBOLS.length){
      const symbol=SYMBOLS[cursor++],held=previous[symbol];
      try{
        const fresh=await loadHistory(symbol);
        if(!validHistory(fresh,symbol))throw new Error('上游历史数据校验失败');
        const currency=ASSETS.find(a=>a.symbol===symbol)?.currency;
        if(currency&&fresh.currency!==currency)throw new Error('上游币种与资产币种不一致');
        if(validHistory(held,symbol)&&fresh.latest<held.latest)throw new Error('上游记录早于已保存行情');
        series[symbol]={...fresh,snapshot:false,stale:false};updated++;
        report(symbol+'：更新至 '+fresh.latest);
      }catch(error){
        if(!validHistory(held,symbol))throw new Error(symbol+' 没有可用的已验证历史数据');
        const warning=/[\u3400-\u9fff]/.test(error.message)?error.message:'行情服务暂不可用';
        series[symbol]={...held,snapshot:true,stale:true,warning};failures.push(symbol);
        report(symbol+'：保留 '+held.latest+' 的记录；'+warning);
      }
    }
  }
  await Promise.all(Array.from({length:concurrency},consumer));
  return {series,updated,failures};
}
