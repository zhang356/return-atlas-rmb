const PAGE = __PAGE__;
const ALLOWED = new Set([...ASSETS.map(a=>a.symbol),'CNY=X','HKD=X']);
const inFlight = new Map();
const memory = new Map(Object.entries(SNAPSHOT).map(([symbol,data])=>[symbol,{time:Date.parse(data.fetchedAt),data:{...data,snapshot:true}}]));
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});


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
