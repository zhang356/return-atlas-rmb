const ETF_LISTING_DATES = {
  '510330.SS':'2013-01-16','510500.SS':'2013-03-15','159915.SZ':'2011-12-09',
  '510050.SS':'2005-02-23','512100.SS':'2016-11-04','588000.SS':'2020-11-16','510880.SS':'2007-01-18',
  '2800.HK':'1999-11-12','2828.HK':'2003-12-10','3033.HK':'2020-08-28','3110.HK':'2013-06-17',
};
export const ASSETS = [
  ["SGOV", "美国短期国债", "Bonds & cash", "USD", "0—3 个月美国国债 ETF"],
  ["SHY", "美国短债", "Bonds & cash", "USD", "1—3 年期美国国债 ETF"],
  ["IEF", "美国中期国债", "Bonds & cash", "USD", "7—10 年期美国国债 ETF"],
  ["TLT", "美国长期国债", "Bonds & cash", "USD", "20 年以上美国国债 ETF"],
  ["BND", "美国综合债券", "Bonds & cash", "USD", "覆盖美国投资级债券市场的 ETF"],
  ["SPY", "标普500", "US indexes", "USD", "道富标普500 ETF"],
  ["QQQ", "纳斯达克100", "US indexes", "USD", "景顺 QQQ ETF，覆盖纳斯达克上市的 100 家大型非金融企业"],
  ["DIA", "道琼斯工业指数", "US indexes", "USD", "道富道琼斯工业平均指数 ETF"],
  ["VTI", "美国全市场", "US indexes", "USD", "先锋美国全股票市场 ETF"],
  ["AMZN", "亚马逊", "US companies", "USD", "亚马逊公司"],
  ["GOOGL", "谷歌母公司", "US companies", "USD", "Alphabet 公司 A 类股"],
  ["NVDA", "英伟达", "US companies", "USD", "英伟达公司"],
  ["META", "Meta 社交平台", "US companies", "USD", "Meta 公司，旗下包括脸书和照片墙等社交平台"],
  ["MSFT", "微软", "US companies", "USD", "微软公司"],
  ["AAPL", "苹果", "US companies", "USD", "苹果公司"],
  ["TSLA", "特斯拉", "US companies", "USD", "特斯拉公司"],
  ["BRK-B", "伯克希尔·哈撒韦", "US companies", "USD", "伯克希尔·哈撒韦 B 类股，业务覆盖多个行业"],
  ["JPM", "摩根大通", "US companies", "USD", "银行与金融服务企业"],
  ["AVGO", "博通", "US companies", "USD", "半导体与基础设施软件企业"],
  ["COST", "开市客", "US companies", "USD", "会员制零售企业"],
  ["GLD", "黄金", "Gold & crypto", "USD", "道富黄金 ETF，以实物黄金支持，价格已反映基金费用"],
  ["SLV", "白银", "Gold & crypto", "USD", "安硕白银信托，以实物白银支持"],
  ["BTC-USD", "比特币", "Gold & crypto", "USD", "比特币美元现货价格，不含质押或其他收益"],
  ["ETH-USD", "以太坊", "Gold & crypto", "USD", "以太币美元现货价格，不含质押收益"],
  ["510330.SS", "沪深300", "A-share ETFs", "CNY", "华夏沪深300 ETF，覆盖 A 股大盘股"],
  ["510500.SS", "中证500", "A-share ETFs", "CNY", "南方中证500 ETF，覆盖 A 股中盘股"],
  ["159915.SZ", "创业板", "A-share ETFs", "CNY", "易方达创业板 ETF，覆盖成长型 A 股企业"],
  ["510050.SS", "上证50", "A-share ETFs", "CNY", "华夏上证50 ETF，覆盖沪市大型蓝筹股"],
  ["512100.SS", "中证1000", "A-share ETFs", "CNY", "南方中证1000 ETF，覆盖 A 股小盘股"],
  ["588000.SS", "科创50", "A-share ETFs", "CNY", "华夏科创50 ETF，覆盖科创板代表性科技企业"],
  ["510880.SS", "上证红利", "A-share ETFs", "CNY", "华泰柏瑞上证红利 ETF，覆盖沪市高股息股票"],
  ["2800.HK", "恒生指数", "Hong Kong ETFs", "HKD", "盈富基金，港币交易柜台"],
  ["2828.HK", "恒生国企", "Hong Kong ETFs", "HKD", "恒生中国企业指数 ETF，覆盖香港上市的内地企业"],
  ["3033.HK", "恒生科技", "Hong Kong ETFs", "HKD", "南方东英恒生科技指数 ETF，港币交易柜台"],
  ["3110.HK", "港股高股息", "Hong Kong ETFs", "HKD", "未来资产环球投资恒生高股息率 ETF，港币交易柜台"],
  ["0700.HK", "腾讯", "China & Hong Kong", "HKD", "腾讯控股，香港上市股票"],
  ["9988.HK", "阿里巴巴", "China & Hong Kong", "HKD", "阿里巴巴集团，香港上市股票"],
  ["VXUS", "美国以外全球股票", "Diversifiers", "USD", "先锋国际股票 ETF，覆盖美国以外市场"],
  ["SCHD", "美国红利股票", "Diversifiers", "USD", "嘉信美国红利股票 ETF"],
  ["VNQ", "美国房地产", "Diversifiers", "USD", "先锋房地产 ETF，覆盖房地产投资信托基金"],
].map(([symbol,name,group,currency,description])=>({symbol,name,group,currency,description,foreign:currency!=='CNY',...(ETF_LISTING_DATES[symbol]?{listingDate:ETF_LISTING_DATES[symbol]}:{})}));
// Keep existing browser selections working when the Hang Seng TECH proxy changes.
export function resolveAssetSymbol(symbol) {
  const resolved=symbol==='3032.HK'?'3033.HK':symbol;
  return ASSETS.some(asset=>asset.symbol===resolved)?resolved:null;
}
export const PERIODS = ['1W','1M','3M','6M','YTD','1Y','3Y','5Y'];
export const DAY = 86400000;
export function dateUTC(day) { return new Date(day+'T00:00:00Z'); }
export function iso(date) { return date.toISOString().slice(0,10); }
export function periodStart(end,period) {
  const d=dateUTC(end);
  if(period==='YTD') return (d.getUTCFullYear()-1)+'-12-31';
  if(period==='1W') return iso(new Date(d.getTime()-7*DAY));
  const n=parseInt(period), month=d.getUTCMonth(), day=d.getUTCDate();
  d.setUTCDate(1);
  if(period.endsWith('M')) d.setUTCMonth(month-n); else d.setUTCFullYear(d.getUTCFullYear()-n);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last)); return iso(d);
}
export function onOrBefore(points,date,maxAge=7) {
  if(!points?.length) return null;
  let lo=0,hi=points.length-1,index=-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(points[mid].d<=date){index=mid;lo=mid+1;}else hi=mid-1;}
  if(index<0) return null;
  const p=points[index];
  return (dateUTC(date)-dateUTC(p.d))/DAY<=maxAge ? p:null;
}
export function fxAt(currency,date,series) {
  if(currency==='CNY') return 1;
  const cny=onOrBefore(series['CNY=X']?.points,date);
  if(!cny?.c) return null;
  if(currency==='USD') return cny.c;
  const hkd=onOrBefore(series['HKD=X']?.points,date);
  return hkd?.c ? cny.c/hkd.c:null;
}
export function netReturn(gross,foreign,taxRate) {return gross-Math.max(0,gross)*(foreign?taxRate:0);}
export function calculate(asset,series,end,period,options={}) {
  const {fx=true,tax=true,taxRate=.2,capital=1000000,asof=false}=options;
  const data=series[asset.symbol];
  if(!data?.points?.length) return {error:data?.error||'历史行情暂不可用'};
  const target=periodStart(end,period),a=onOrBefore(data.points,target),b=onOrBefore(data.points,end);
  if(!a||!b) return {error:'历史记录不足，或收盘数据距离目标日期过久'};
  // All assets use the same target dates. FX is valued on the same two dates,
  // including holidays; a prior published fix is permitted for at most 7 days.
  const f0=fx?fxAt(asset.currency,a.d,series):1,f1=fx?fxAt(asset.currency,b.d,series):1;
  if(!f0||!f1) return {error:'缺少所需日期的历史汇率'};
  const local=b.a/a.a-1,price=b.c/a.c-1,income=local-price;
  const currency=f1/f0-1,gross=(1+local)*(1+currency)-1;
  const taxFraction=tax&&asset.foreign?Math.max(gross,0)*taxRate:0;
  const net=gross-taxFraction;
  return {local,price,income,currency,fxContribution:gross-local,gross,tax:taxFraction,net,
    gain:capital*net,value:capital*(1+net),start:a.d,end:b.d,f0,f1,a,b,target,asof};
}
export function trajectory(asset,series,end,period,options={}) {
  const r=calculate(asset,series,end,period,options); if(r.error) return [];
  const points=series[asset.symbol].points.filter(p=>p.d>=r.start&&p.d<=r.end);
  return points.map(p=>{
    const fx=options.fx!==false?fxAt(asset.currency,p.d,series):1;
    if(!fx) return null;
    const gross=(p.a/r.a.a)*(fx/r.f0)-1;
    return {d:p.d,v:(options.capital||1000000)*(1+netReturn(gross,asset.foreign,options.tax!==false?(options.taxRate??.2):0))};
  }).filter(Boolean);
}
