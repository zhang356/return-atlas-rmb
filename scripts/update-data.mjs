import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {refreshHistory,validHistory,SYMBOLS} from './refresh-history.mjs';

const previous=JSON.parse(await readFile('src/snapshot.json','utf8'));
try{
  const cached=JSON.parse(await readFile('.cache/history.json','utf8'));
  for(const symbol of SYMBOLS)if(validHistory(cached[symbol],symbol)&&cached[symbol].latest>=previous[symbol].latest)previous[symbol]=cached[symbol];
}catch(error){if(error.code!=='ENOENT')console.warn('历史缓存不可用，改用仓库内已验证数据。');}
const result=await refreshHistory(previous,{report:console.log});
await mkdir('.cache',{recursive:true});
await writeFile('.cache/history.json',JSON.stringify(result.series));
console.log('行情更新完成：'+result.updated+'/'+SYMBOLS.length+'；保留旧记录：'+result.failures.length);
if(process.env.GITHUB_STEP_SUMMARY){
  await writeFile(process.env.GITHUB_STEP_SUMMARY,'### 行情更新\n成功 '+result.updated+'/'+SYMBOLS.length+' 组。\n\n'+(result.failures.length?'保留上次行情并在页面提示：'+result.failures.join('、'):'所有行情已更新。')+'\n',{flag:'a'});
}
