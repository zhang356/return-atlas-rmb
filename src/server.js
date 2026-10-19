const PAGE = __PAGE__;
const ALLOWED = new Set([...ASSETS.map(a=>a.symbol),'CNY=X','HKD=X']);
const inFlight = new Map();
const memory = new Map(Object.entries(SNAPSHOT).map(([symbol,data])=>[symbol,{time:Date.parse(data.fetchedAt),data:{...data,snapshot:true}}]));
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});

function marketDate(timestamp,zone='UTC') {
  return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp*1000));
}
async function fetchHistoryWindow(symbol,from,to) {
  let lastError='行情服务暂不可用';
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']) {
    try {
      const url='https://'+host+'/v8/finance/chart/'+encodeURIComponent(symbol)+'?period1='+from+'&period2='+to+'&interval=1d&events=div%2Csplits&includeAdjustedClose=true';
      const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:AbortSignal.timeout(14000)});
      if(!response.ok) throw new Error('行情服务返回错误状态 '+response.status);
      const payload=await response.json();
      const r=payload.chart?.result?.[0];
      if(!r?.timestamp?.length) throw new Error('数据源未返回历史行情记录');
      const adj=r.indicators?.adjclose?.[0]?.adjclose,close=r.indicators?.quote?.[0]?.close;
      if(!adj?.length&&!symbol.endsWith('=X')) throw new Error('缺少包含分红调整的历史价格');
      const zone=r.meta.exchangeTimezoneName||'UTC',now=Math.floor(Date.now()/1000);
      const today=marketDate(now,zone);
      const session=r.meta.currentTradingPeriod?.regular;
      const points=[];
      for(let i=0;i<r.timestamp.length;i++) {
        const d=marketDate(r.timestamp[i],zone),c=close?.[i],a=adj?.[i]??(symbol.endsWith('=X')?c:null);
        // Ignore today's incomplete bar, including the continuous FX/crypto session.
        const completedToday=d===today&&session&&now>=session.end&&marketDate(session.end-1,zone)===today;
        if(d>today||(d===today&&!completedToday)||!Number.isFinite(c)||c<=0||!Number.isFinite(a)||a<=0) continue;
        points.push({d,c,a});
      }
      if(points.length<2) throw new Error('暂无已完成交易日的收盘数据');
      const unique=[...new Map(points.map(p=>[p.d,p])).values()].sort((a,b)=>a.d.localeCompare(b.d));
      return {symbol,currency:r.meta.currency,points:unique,source:'Yahoo Finance',fetchedAt:new Date().toISOString(),latest:unique.at(-1).d,adjusted:!!adj?.length,dividendCount:Object.keys(r.events?.dividends||{}).length};
    } catch(error) {lastError=/[\u3400-\u9fff]/.test(error.message)?error.message:'行情服务连接超时或暂不可用';}
  }
  throw new Error(lastError);
}

async function getHistory(symbol) {
  const to=Math.floor(Date.now()/1000),from=to-Math.ceil(6*366*86400);
  const data=await fetchHistoryWindow(symbol,from,to),asset=ASSETS.find(a=>a.symbol===symbol);
  const expectedStart=asset?.listingDate&&asset.listingDate>iso(new Date(from*1000))?asset.listingDate:iso(new Date(from*1000));
  if(asset?.listingDate&&(dateUTC(data.points[0].d)-dateUTC(expectedStart))/DAY>30){
    try {
      // A provider may truncate a long request. Request the missing segment with
      // overlap, then align adjusted levels before joining the two windows.
      const early=await fetchHistoryWindow(symbol,from,Math.floor(dateUTC(data.points[0].d).getTime()/1000)+14*86400);
      const overlap=early.points.find(p=>data.points.some(q=>q.d===p.d));
      if(early.points[0].d<data.points[0].d&&overlap){
        const anchor=data.points.find(p=>p.d===overlap.d),scale=anchor.a/overlap.a;
        const earlier=early.points.filter(p=>p.d<data.points[0].d).map(p=>({...p,a:p.a*scale}));
        data.points=[...earlier,...data.points];data.dividendCount+=early.dividendCount;data.historyBackfilled=true;
      }
    } catch(error){data.historyWarning='较早的历史日线暂不可用：'+error.message;}
    if((dateUTC(data.points[0].d)-dateUTC(expectedStart))/DAY>30)data.historyWarning='数据源的日线历史始于 '+data.points[0].d+'，更早周期可能无法计算。';
  }
  return data;
}

export default {
  async fetch(request,env,ctx) {
    const u=new URL(request.url);
    if(u.pathname==='/api/history') {
      const symbol=u.searchParams.get('symbol');
      if(!ALLOWED.has(symbol)) return json({error:'暂不支持该资产'},400);
      const held=memory.get(symbol);
      if(held&&(env?.LOCAL_PREVIEW||(u.searchParams.get('refresh')!=='1'&&Date.now()-held.time<3600000))) return json(held.data);
      if(!inFlight.has(symbol)) inFlight.set(symbol,getHistory(symbol).finally(()=>inFlight.delete(symbol)));
      try {
        const data=await inFlight.get(symbol);
        memory.set(symbol,{time:Date.now(),data});
        return json(data,200,{'cache-control':'private, max-age=3600'});
      } catch(error) {
        if(held) return json({...held.data,stale:true,warning:error.message});
        return json({symbol,error:'历史数据暂不可用。'+error.message},503);
      }
    }
    if(u.pathname==='/api/catalog') return json(ASSETS);
    if(u.pathname==='/favicon.svg') return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#135e4b"/><path d="M10 28V18h5v10m3 0V12h5v16m3 0V7h5v21" stroke="#e7f1ca" stroke-width="3" fill="none"/></svg>',{headers:{'content-type':'image/svg+xml'}});
    if(u.pathname!=='/') return new Response('未找到该页面',{status:404});
    return new Response(PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
  }
};
