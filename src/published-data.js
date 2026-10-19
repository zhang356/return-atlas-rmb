export async function loadPublishedData(baseUrl,force=false,fetcher=fetch) {
  const url=new URL('./data/market.json',baseUrl);
  const response=await fetcher(url,{cache:force?'reload':'no-cache'});
  if(!response.ok)throw new Error('已发布行情暂不可用，请稍后重试');
  const data=await response.json();
  if(data.schema!==1||!data.series||!Number.isFinite(Date.parse(data.generatedAt)))throw new Error('已发布行情格式无效');
  return data;
}
