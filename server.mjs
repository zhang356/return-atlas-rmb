import http from 'node:http';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import worker from './worker/index.js';

const port=Number(process.env.PORT||8080);
const host=process.env.HOST||'0.0.0.0';
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT 必须为 1—65535 之间的整数');
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){
      res.writeHead(405,{'content-type':'text/plain; charset=utf-8',allow:'GET, HEAD'});
      res.end('仅支持读取请求');return;
    }
    // Use a fixed origin for URL parsing; visitors do not need an account or token.
    const request=new Request(new URL(req.url,'http://localhost'),{method:'GET'});
    const response=await worker.fetch(request,{},{});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(req.method==='HEAD'||!response.body){res.end();return;}
    await pipeline(Readable.fromWeb(response.body),res);
  }catch(error){
    console.error('请求处理失败：',error.message);
    if(!res.headersSent)res.writeHead(500,{'content-type':'text/plain; charset=utf-8'});
    res.end('服务暂不可用，请稍后重试');
  }
});
server.listen(port,host,()=>console.log('收益图谱已启动：http://'+host+':'+port));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
