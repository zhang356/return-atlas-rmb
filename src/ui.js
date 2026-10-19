let publishedAt='',publishedDaily=false;
const $=id=>document.getElementById(id);
const COLORS=['#17664f','#6686bc','#bd9761','#9b77ac','#b47666','#759681'];
const PERIOD_NAMES={'1W':'1周','1M':'1个月','3M':'3个月','6M':'6个月','YTD':'年初至今','1Y':'1年','3Y':'3年','5Y':'5年'};
const GROUP_NAMES={'All assets':'全部资产','Bonds & cash':'债券与现金','US indexes':'美股指数','US companies':'美国公司','Gold & crypto':'贵金属与加密资产','A-share ETFs':'A股 ETF','Hong Kong ETFs':'港股 ETF','China & Hong Kong':'中国公司','Diversifiers':'其他资产'};
const CURRENCY_NAMES={CNY:'人民币',USD:'美元',HKD:'港币'};
const dataError=message=>/[\u3400-\u9fff]/.test(String(message))?String(message):'行情服务暂不可用，请稍后刷新重试';
const groups=['All assets',...new Set(ASSETS.map(a=>a.group))];
let saved={};try{saved=JSON.parse(localStorage.getItem('return-atlas-settings-v1')||'{}')}catch{}
const state={series:{},period:PERIODS.includes(saved.period)?saved.period:'1Y',capital:saved.capital||1000000,capitalCurrency:saved.capitalCurrency||'CNY',fx:saved.fx!==false,tax:saved.tax!==false,taxRate:saved.taxRate??.2,end:saved.end||'',focus:resolveAssetSymbol(saved.focus)||'SPY',selected:new Set((saved.selected||['SPY','QQQ','SGOV','GLD','2800.HK']).map(resolveAssetSymbol).filter(Boolean).slice(0,6)),group:'All assets',query:'',loading:true,done:0,errors:[]};
const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(n,digits=0)=>'¥'+new Intl.NumberFormat('zh-CN',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(n);
const pct=n=>Number.isFinite(n)?(n>0?'+':'')+(n*100).toFixed(2)+'%':'—';
const gain=n=>(n<0?'−':n>0?'+':'')+money(Math.abs(n));
const sign=n=>n<0?'negative':'positive';
const shortMoney=n=>{const a=Math.abs(n);return (n<0?'−':'')+'¥'+(a>=1e8?(a/1e8).toFixed(1)+'亿':a>=1e4?(a/1e4).toFixed(a>=1e6?0:1)+'万':Math.round(a))};
const dayLabel=d=>new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(dateUTC(d));
const chinaToday=()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date());
const endDate=()=>state.end||iso(new Date(dateUTC(chinaToday()).getTime()-DAY));
function capitalRMB(){if(state.capitalCurrency==='CNY')return state.capital;const rate=fxAt('USD',endDate(),state.series);return rate?state.capital*rate:null;}
function options(){return {fx:state.fx,tax:state.tax,taxRate:state.taxRate,capital:capitalRMB()??0};}
function result(asset,period=state.period){if(capitalRMB()===null)return {error:'美元本金需要截止日期的有效汇率'};return calculate(asset,state.series,endDate(),period,options());}
function persist(){try{localStorage.setItem('return-atlas-settings-v1',JSON.stringify({...state,series:undefined,selected:[...state.selected],errors:undefined,query:undefined,loading:undefined,done:undefined,group:undefined,sort:undefined}));}catch{}}
function renderPeriods(){
  const index=PERIODS.indexOf(state.period),slider=$('periodSlider');
  slider.value=index;slider.setAttribute('aria-valuetext',PERIOD_NAMES[state.period]);slider.style.setProperty('--range-progress',(index/7*100)+'%');
  $('periodValue').textContent=PERIOD_NAMES[state.period];$('chartPeriod').textContent=PERIOD_NAMES[state.period];
  $('periodStops').innerHTML=PERIODS.map(p=>'<button class="'+(p===state.period?'active':'')+'" data-period="'+p+'" aria-pressed="'+(p===state.period)+'" aria-label="查看'+PERIOD_NAMES[p]+'收益">'+PERIOD_NAMES[p]+'</button>').join('');
}
function renderSummary(){
  const results=ASSETS.map(a=>({a,r:result(a)})).filter(x=>!x.r.error).sort((a,b)=>b.r.net-a.r.net);
  $('winnerCap').textContent='可比较 '+results.length+' 项资产中的最高收益 · '+PERIOD_NAMES[state.period];
  const best=results[0];
  $('winnerName').textContent=best?best.a.name:state.loading?'正在读取历史行情…':'暂无可比较收益';
  $('winnerValue').textContent=best?'期末价值 '+money(best.r.value):'请查看下方数据状态';
  $('winnerPct').textContent=best?pct(best.r.net):'—';
  const asset=ASSETS.find(a=>a.symbol===state.focus)||ASSETS[5],r=result(asset);
  $('focusCap').textContent=asset.name+' · 税后期末价值';
  $('focusValue').textContent=r.error?'—':money(r.value);
  $('focusGain').textContent=r.error?dataError(r.error):'净收益 '+gain(r.gain)+' · '+PERIOD_NAMES[state.period];
  $('focusPct').textContent=r.error?'—':pct(r.net);
  const f0=fxAt('USD',periodStart(endDate(),state.period),state.series),f1=fxAt('USD',endDate(),state.series);
  $('fxValue').textContent=f1?f1.toFixed(4)+' 元 / 美元':'—';
  $('fxPct').textContent=f0&&f1?pct(f1/f0-1):'—';
  $('fxFoot').textContent=f0&&f1?'期初 '+f0.toFixed(4)+' 元 / 美元 · '+PERIOD_NAMES[state.period]:'历史美元兑人民币汇率';
  if(state.capitalCurrency==='USD')$('capitalHint').textContent=capitalRMB()?'按截止日汇率折合 '+money(capitalRMB()):'等待美元兑人民币汇率';
  else $('capitalHint').textContent='每项资产分别投入同等本金';
}
function renderBreakdown(){
  const asset=ASSETS.find(a=>a.symbol===state.focus)||ASSETS[5],r=result(asset);$('focusAsset').value=asset.symbol;
  if(r.error){$('breakrows').innerHTML='<div class="breakrow"><span>数据状态</span><strong>暂无数据</strong></div>';$('breaknote').textContent=dataError(r.error);return;}
  const capital=capitalRMB();
  const rows=[['价格变化',capital*r.price],['分红与再投资',capital*r.income],['汇率贡献',capital*r.fxContribution],['假设税费',-capital*r.tax]];
  $('breakrows').innerHTML=rows.map(([label,value])=>'<div class="breakrow"><span>'+label+'</span><strong class="'+sign(value)+'">'+gain(value)+'</strong></div>').join('')+'<div class="breakrow total"><span>净收益 · '+PERIOD_NAMES[state.period]+'</span><strong class="'+sign(r.gain)+'">'+gain(r.gain)+'</strong></div><div class="detaildates">'+dayLabel(r.start)+' → '+dayLabel(r.end)+'</div>';
  const history=state.series[asset.symbol];
  $('breaknote').textContent=asset.description+'。'+(asset.foreign?(state.tax?'假设在期末卖出，仅对盈利计税，不对亏损退税。':'已关闭境外收益税务假设。'):'不额外计入境外收益假设税费。')+(!state.fx?'已忽略汇率变化。':'')+(asset.listingDate?'上市日期：'+dayLabel(asset.listingDate)+'。可用日线历史：'+dayLabel(history.points[0].d)+'至'+dayLabel(history.latest)+'。':'');
}
function visibleAssets(){return ASSETS.filter(a=>(state.group==='All assets'||a.group===state.group)&&(!state.query||(a.name+' '+a.symbol+' '+a.description).toLowerCase().includes(state.query.toLowerCase())));}
function renderMosaic(){
  const container=$('mosaic'),assets=visibleAssets(),width=container.clientWidth||600;
  container.setAttribute('aria-busy',state.loading);
  const items=assets.map(a=>{const r=result(a);return {symbol:a.symbol,asset:a,r,net:r.error?null:r.net};});
  let rectangles;
  if(width<800){
    const max=Math.max(...items.map(i=>Math.abs(i.net??0)),.001),columns=width<400?1:2,heights=Array(columns).fill(0);
    rectangles=items.sort((a,b)=>Math.abs(b.net??0)-Math.abs(a.net??0)).map(item=>{const column=heights.indexOf(Math.min(...heights)),h=145+110*Math.abs(item.net??0)/max;const r={...item,x:column*width/columns,y:heights[column],w:width/columns,h};heights[column]+=h;return r;});
    container.style.height=(Math.max(...heights)||190)+'px';
  }else{
    const columns=width>=1100?5:width>=800?4:width>=600?3:2;
    const height=Math.max(items.length===1?240:360,Math.ceil(items.length/columns)*160);
    container.style.height=(items.length?height:190)+'px';rectangles=returnMosaic(items,width,height);
  }
  const max=Math.max(...items.map(i=>Math.abs(i.net??0)),.001);
  container.innerHTML=rectangles.map(tile=>{
    const a=tile.asset,r=tile.r,available=!r.error,intensity=available?Math.sqrt(Math.abs(r.net)/max):0;
    const light=available?(r.net>=0?94-62*intensity:94-48*intensity):94;
    const background=available?'hsl('+(r.net>=0?'151 '+(27+intensity*10):'7 '+(30+intensity*10))+'% '+light+'%)':'#edf0e9';
    const ink=!available?'#7b8576':light<57?'#ffffff':r.net>=0?'#184d36':'#783a31';
    const selected=state.selected.has(a.symbol),roomy=tile.w>240&&tile.h>205,compact=tile.w<180||tile.h<155;
    const raw=available?pct(r.local):'—',net=available?pct(r.net):state.loading?'读取中…':'暂无数据';
    const detail=available?dayLabel(r.start)+' → '+dayLabel(r.end)+' · 原币收益（'+CURRENCY_NAMES[a.currency]+'）'+raw+' · 人民币净收益 '+net:dataError(r.error);
    return '<article class="mosaic-tile '+(selected?'selected ':'')+(state.focus===a.symbol?'focused ':'')+(roomy?'roomy ':'')+(compact?'compact ':'')+(!available?'unavailable':'')+'" data-symbol="'+a.symbol+'" data-net="'+(available?r.net:'')+'" style="left:'+tile.x+'px;top:'+tile.y+'px;width:'+tile.w+'px;height:'+tile.h+'px;--tile-color:'+background+';--tile-ink:'+ink+'">'+
      '<div class="mosaic-surface"><button class="mosaic-open" data-focus="'+a.symbol+'" aria-label="'+escaped(a.name+'，原币收益 '+raw+'，人民币净收益 '+net+'。查看收益明细。')+'" title="'+escaped(detail)+'"><span class="mosaic-heading"><span class="mosaic-name">'+escaped(a.name)+'</span><span class="mosaic-symbol">'+a.symbol+'</span></span><span class="mosaic-returns"><span class="mosaic-real"><span class="return-label">人民币净收益</span><strong>'+net+'</strong></span><span class="mosaic-raw"><span>原币收益 · '+CURRENCY_NAMES[a.currency]+'</span>'+raw+'</span></span></button><label class="mosaic-check" title="'+(selected?'从对比图移除':'加入对比图')+'"><input type="checkbox" data-select="'+a.symbol+'" '+(selected?'checked':'')+' aria-label="对比'+escaped(a.name)+'"></label></div></article>';
  }).join('')||'<div class="mosaic-empty">未找到匹配的资产。</div>';
  $('mosaicCount').textContent=assets.length+' 项资产 · '+PERIOD_NAMES[state.period]+' · '+(state.fx?'计入历史汇率':'忽略汇率变化')+' · '+(state.tax?(state.taxRate*100).toFixed(0)+'% 境外盈利假设税率':'不计假设税费');
}
let chartSeries=[];
function renderChart(){
  const capital=capitalRMB(),entries=[...state.selected].map(symbol=>{const a=ASSETS.find(x=>x.symbol===symbol);return {a,points:trajectory(a,state.series,endDate(),state.period,options())};}).filter(x=>x.points.length);
  chartSeries=entries;
  $('chartSubtitle').textContent=(capital?money(capital):'初始本金')+' · 持有'+PERIOD_NAMES[state.period]+' · '+(state.fx?'计入汇率影响':'忽略汇率变化')+' · '+(state.tax?'扣除假设税费':'未扣假设税费');
  $('legend').innerHTML=[...state.selected].map((s,i)=>{const a=ASSETS.find(x=>x.symbol===s),r=result(a);return '<button data-legend="'+s+'" class="'+(state.focus===s?'active':'')+'" title="查看'+escaped(a.name)+'收益明细"><i style="background:'+COLORS[i]+'"></i>'+escaped(a.name)+(r.error?' · 暂无数据':'')+'</button>';}).join('')+'<span class="hint">在下方方块中勾选对比资产</span>';
  if(!entries.length){$('plot').innerHTML='<div class="chartempty"><strong>'+(state.loading?'正在读取所选资产…':state.selected.size?'所选资产在此周期暂无历史数据':'请选择要对比的资产')+'</strong><span>'+(state.loading?'正在获取历史收盘价与汇率。':state.selected.size?'请切换周期、查看数据状态，或刷新行情。':'勾选下方方块角落的复选框，最多选择 6 项资产。')+'</span></div>';return;}
  const W=Math.max(280,$('plot').clientWidth),H=Math.max(220,$('plot').clientHeight),left=56,right=12,top=15,bottom=30;
  const all=entries.flatMap(x=>x.points),values=all.map(p=>p.v),dates=all.map(p=>dateUTC(p.d).getTime());
  const minT=Math.min(...dates),maxT=Math.max(...dates);
  let minV=Math.min(...values,capital),maxV=Math.max(...values,capital),span=maxV-minV||capital*.1;
  minV=Math.max(0,minV-span*.12);maxV+=span*.12;span=maxV-minV;
  const x=t=>left+(t-minT)/(maxT-minT||1)*(W-left-right),y=v=>H-bottom-(v-minV)/span*(H-top-bottom);
  let svg='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="持有'+PERIOD_NAMES[state.period]+'的假设投资组合人民币价值"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#17664f" stop-opacity=".10"/><stop offset="100%" stop-color="#17664f" stop-opacity="0"/></linearGradient></defs>';
  for(let i=0;i<=4;i++){const v=minV+span*i/4,Y=y(v);svg+='<line x1="'+left+'" y1="'+Y+'" x2="'+(W-right)+'" y2="'+Y+'" stroke="#eaf0e5" stroke-dasharray="3 4"/><text x="'+(left-12)+'" y="'+(Y+4)+'" text-anchor="end" fill="#899185" font-family="sans-serif" font-size="10">'+shortMoney(v)+'</text>';}
  if(capital>=minV&&capital<=maxV)svg+='<line x1="'+left+'" y1="'+y(capital)+'" x2="'+(W-right)+'" y2="'+y(capital)+'" stroke="#bfcbb7" stroke-dasharray="4 5"/>';
  for(let i=0;i<=4;i++){const t=minT+(maxT-minT)*i/4,d=new Date(t),label=new Intl.DateTimeFormat('zh-CN',{month:'numeric',...(state.period==='1W'?{day:'numeric'}:state.period==='3Y'||state.period==='5Y'?{year:'2-digit'}:{}),timeZone:'UTC'}).format(d);svg+='<text x="'+x(t)+'" y="'+(H-7)+'" fill="#899185" text-anchor="middle" font-family="sans-serif" font-size="10">'+label+'</text>';}
  entries.forEach((entry,j)=>{const color=COLORS[[...state.selected].indexOf(entry.a.symbol)],p=entry.points,step=Math.max(1,Math.floor(p.length/500)),draw=p.filter((v,i)=>i%step===0||i===p.length-1),d=draw.map((p,i)=>(i?'L':'M')+x(dateUTC(p.d).getTime()).toFixed(2)+','+y(p.v).toFixed(2)).join(' ');if(j===0)svg+='<path d="'+d+' L'+x(maxT)+','+(H-bottom)+' L'+x(minT)+','+(H-bottom)+' Z" fill="url(#chartFill)"/>';svg+='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(entry.a.symbol===state.focus?2.8:1.8)+'" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>';const last=p.at(-1);svg+='<circle cx="'+x(dateUTC(last.d).getTime())+'" cy="'+y(last.v)+'" r="3" fill="'+color+'"/>';});
  svg+='<line id="crosshair" x1="0" x2="0" y1="'+top+'" y2="'+(H-bottom)+'" stroke="#b8c4ae" stroke-dasharray="3 4" opacity="0"/></svg><div id="tooltip" class="tooltip"></div>';
  $('plot').innerHTML=svg;
  $('plot').onpointermove=e=>{const rect=$('plot').getBoundingClientRect(),relative=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),time=minT+Math.max(0,Math.min(1,(relative*W-left)/(W-left-right)))*(maxT-minT),day=iso(new Date(time));const tip=$('tooltip');let content='<b>'+dayLabel(day)+'</b>';entries.forEach(en=>{const p=onOrBefore(en.points,day);if(p)content+='<div><span><i style="background:'+COLORS[[...state.selected].indexOf(en.a.symbol)]+'"></i>'+escaped(en.a.name)+'</span><span>'+money(p.v)+'</span></div>';});tip.innerHTML=content;tip.style.display='block';tip.style.left=Math.max(0,Math.min(rect.width-230,e.clientX-rect.left+12))+'px';tip.style.top='20px';const line=$('crosshair');line.setAttribute('x1',x(time));line.setAttribute('x2',x(time));line.setAttribute('opacity',1);};
  $('plot').onpointerleave=()=>{if($('tooltip'))$('tooltip').style.display='none';if($('crosshair'))$('crosshair').setAttribute('opacity',0);};
}
function renderStatus(){
  const loaded=Object.values(state.series).filter(v=>v.points?.length),failed=state.errors.length;
  $('busy').style.display=state.loading?'block':'none';$('refresh').disabled=state.loading;
  $('statusdot').classList.toggle('loading',state.loading);
  $('status').textContent=state.loading?'正在读取行情 · '+state.done+'/'+(ASSETS.length+2):loaded.length?(STATIC_SITE?'已发布收盘行情 · ':loaded.some(x=>x.snapshot)?'已校验历史数据 · ':'每日历史行情 · ')+loaded.length+'/'+(ASSETS.length+2)+' 组数据':'行情数据暂不可用';
  const dates=loaded.filter(x=>x.symbol!=='CNY=X'&&x.symbol!=='HKD=X').map(x=>x.latest).sort();
  $('asofLabel').textContent=dates.length?'收盘日期：'+dayLabel(dates[0])+(dates[0]!==dates.at(-1)?' – '+dayLabel(dates.at(-1)):''):'数据来源：雅虎财经';
  const stale=loaded.filter(x=>x.stale||(dateUTC(endDate())-dateUTC(x.latest))/DAY>4);
  if(STATIC_SITE){$('dataUpdateNote').hidden=false;$('dataUpdateNote').textContent=(publishedDaily?'每日更新收盘行情；':'收盘行情；自动更新尚未启用。')+'刷新按钮重新读取已发布的数据。'+(publishedAt?'数据发布时间：'+new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(publishedAt))+'（北京时间）。':'');}
  const gaps=loaded.filter(x=>x.historyWarning);
  if(failed||stale.length||gaps.length){$('notice').classList.add('show');$('notice').innerHTML=(failed?'<strong>'+failed+' 组数据暂不可用。</strong> 依赖缺失记录的收益显示“暂无数据”。 ':'')+(stale.length?'<strong>'+stale.length+' 组数据使用较早记录。</strong> 请核对实际估值日期。 ':'')+(gaps.length?'<strong>'+gaps.length+' 组数据的历史覆盖有限。</strong> 较长周期可能显示“暂无数据”。 ':'')+'<button id="errorsToggle">查看数据详情</button><div id="errorDetails" class="errorlist" hidden>'+state.errors.map(e=>'<div>'+escaped(e.symbol+'：'+dataError(e.error))+'</div>').join('')+stale.map(e=>'<div>'+escaped(e.symbol+'：最近收盘日期 '+dayLabel(e.latest)+(e.stale?'；实时刷新失败，使用已保存的数据':''))+'</div>').join('')+gaps.map(e=>'<div>'+escaped(e.symbol+'：数据源的日线历史始于'+dayLabel(e.points[0].d)+'，更早周期可能无法计算。')+'</div>').join('')+'</div>';$('errorsToggle').onclick=()=>{$('errorDetails').hidden=!$('errorDetails').hidden;};}
  else $('notice').classList.remove('show');
}
function render(){renderPeriods();renderSummary();renderBreakdown();renderChart();renderMosaic();renderStatus();persist();}
async function loadData(force=false){
  state.loading=true;state.done=0;state.errors=[];renderStatus();
  const first=[...new Set(['CNY=X','HKD=X',...state.selected,state.focus,...ASSETS.map(a=>a.symbol)])];
  let published;
  if(STATIC_SITE){
    try{published=await loadPublishedData(document.baseURI,force);publishedAt=published.generatedAt;publishedDaily=published.dailyUpdates===true;}
    catch(error){state.errors=first.map(symbol=>({symbol,error:dataError(error.message)}));for(const data of Object.values(state.series))data.stale=true;state.loading=false;render();return;}
  }
  let cursor=0;
  async function consumer(){while(cursor<first.length){const symbol=first[cursor++];try{
    let data;
    if(STATIC_SITE){data=published.series[symbol];}
    else{const response=await fetch('/api/history?symbol='+encodeURIComponent(symbol)+(force?'&refresh=1':''));data=await response.json();if(!response.ok)throw new Error(data.error||'暂无有效历史行情');}
    if(!data?.points?.length)throw new Error('暂无有效历史行情');state.series[symbol]=data;
  }catch(e){state.errors.push({symbol,error:dataError(e.message)});if(!state.series[symbol])state.series[symbol]={symbol,error:dataError(e.message)};else state.series[symbol].stale=true;}finally{state.done++;if(!STATIC_SITE)render();}}}
  await Promise.all(Array.from({length:5},consumer));state.loading=false;render();
}
function exportCSV(){
  const header=['资产名称','代码','原币收益币种','持有周期','实际起始日','实际截止日','原币总收益率（%）','人民币净收益率（%）','计入汇率变化','境外盈利假设税率（%）','数据来源','数据获取时间','数据状态'];
  const rows=[header];visibleAssets().forEach(a=>{const r=result(a),data=state.series[a.symbol];rows.push([a.name,a.symbol,CURRENCY_NAMES[a.currency],PERIOD_NAMES[state.period],r.start||'',r.end||'',r.error?'':(r.local*100).toFixed(4),r.error?'':(r.net*100).toFixed(4),state.fx?'是':'否',state.tax&&a.foreign?state.taxRate*100:0,data?.source==='Yahoo Finance'?'雅虎财经':data?.source||'',data?.fetchedAt||'',r.error?dataError(r.error):data?.stale?'刷新失败，使用已保存的数据':'正常']);});
  const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='收益图谱-'+PERIOD_NAMES[state.period]+'-'+endDate()+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('capital').value=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(state.capital);$('capitalCurrency').value=state.capitalCurrency;$('taxRate').value=state.taxRate*100;$('endDate').value=endDate();$('endDate').max=chinaToday();
$('fxToggle').setAttribute('aria-checked',state.fx);$('taxToggle').setAttribute('aria-checked',state.tax);
$('focusAsset').innerHTML=ASSETS.map(a=>'<option value="'+a.symbol+'">'+escaped(a.name)+'</option>').join('');
$('filters').innerHTML=groups.map(g=>'<button data-group="'+g+'" class="'+(state.group===g?'active':'')+'">'+GROUP_NAMES[g]+'</button>').join('');
$('capital').addEventListener('change',()=>{const val=Number($('capital').value.replaceAll(',','').replaceAll(' ',''));if(Number.isFinite(val)&&val>0&&val<=1e15){state.capital=val;$('capital').setCustomValidity('');}else $('capital').setCustomValidity('请输入大于 0 且不超过 1,000,000,000,000,000 的金额。');$('capital').reportValidity();$('capital').value=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(state.capital);render();});
$('capital').addEventListener('input',()=>{const val=Number($('capital').value.replaceAll(',','').replaceAll(' ',''));if(Number.isFinite(val)&&val>0&&val<=1e15){state.capital=val;$('capital').setCustomValidity('');render();}});
$('capitalCurrency').onchange=()=>{state.capitalCurrency=$('capitalCurrency').value;render();};
$('endDate').onchange=()=>{if($('endDate').value&&$('endDate').value<=chinaToday()){state.end=$('endDate').value;render();}};
$('taxRate').onchange=()=>{const n=Number($('taxRate').value);if(Number.isFinite(n)&&n>=0&&n<=100)state.taxRate=n/100;$('taxRate').value=state.taxRate*100;render();};
['fx','tax'].forEach(key=>$(key+'Toggle').onclick=()=>{state[key]=!state[key];$(key+'Toggle').setAttribute('aria-checked',state[key]);render();});
$('periodSlider').oninput=()=>{state.period=PERIODS[Number($('periodSlider').value)];render();};
$('periodStops').onclick=e=>{const p=e.target.dataset.period;if(p){state.period=p;render();}};
$('focusAsset').onchange=()=>{state.focus=$('focusAsset').value;render();};
$('legend').onclick=e=>{const b=e.target.closest('[data-legend]');if(b){state.focus=b.dataset.legend;render();}};
$('filters').onclick=e=>{const g=e.target.dataset.group;if(g){state.group=g;[...$('filters').children].forEach(b=>b.classList.toggle('active',b.dataset.group===g));renderMosaic();}};
$('search').oninput=()=>{state.query=$('search').value;renderMosaic();};
$('mosaic').onclick=e=>{
  const input=e.target.closest('[data-select]');
  if(input){const s=input.dataset.select;if(state.selected.has(s))state.selected.delete(s);else if(state.selected.size<6)state.selected.add(s);else{input.checked=false;$('selectionNotice').textContent='最多对比 6 项资产，请先取消一项再添加。';return;}$('selectionNotice').textContent='';render();return;}
  const focus=e.target.closest('[data-focus]');if(focus){state.focus=focus.dataset.focus;render();}
};
if(STATIC_SITE){$('refresh').title='重新读取已发布行情；数据每日更新';}
$('refresh').onclick=()=>loadData(true);$('export').onclick=exportCSV;
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{renderChart();renderMosaic();},120);});
render();loadData();
