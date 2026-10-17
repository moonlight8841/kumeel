// Shared Node/Vercel adapter: preserve each Set-Cookie separately.
export async function toWebRequest(req,{maximum=3*1024*1024}={}){
 const headers=new Headers()
 for(const [key,value] of Object.entries(req.headers||{})){if(Array.isArray(value))for(const item of value)headers.append(key,item);else if(value!==undefined)headers.set(key,String(value))}
 const host=headers.get('host')||'localhost'
 const scheme=host.startsWith('localhost')||host.startsWith('127.0.0.1')?'http':'https'
 let body
 if(!['GET','HEAD'].includes(req.method)){
  if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body)
  else{const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>maximum)throw Error('Body too large');chunks.push(Buffer.from(chunk))}body=Buffer.concat(chunks)}
  if(Buffer.byteLength(body)>maximum)throw Error('Body too large')
 }
 return new Request(`${scheme}://${host}${req.url}`,{method:req.method,headers,body})
}
export async function sendWebResponse(response,res){
 res.statusCode=response.status
 for(const [key,value] of response.headers){if(key!=='set-cookie')res.setHeader(key,value)}
 const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies)
 res.end(Buffer.from(await response.arrayBuffer()))
}
export function nodeRoute(handler,options){return async(req,res)=>{try{return await sendWebResponse(await handler(await toWebRequest(req,options)),res)}catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:{code:'backend_unavailable',status:503}}))}}}
export function nodeOwnerRoute(handler,bridge){return async(req,res)=>{
 try{
 const request=await toWebRequest(req,{maximum:40000})
 const result=await bridge(request,async next=>{
  const headers=Object.fromEntries(next.headers);const body=['GET','HEAD'].includes(next.method)?undefined:await next.text()
  let status=200,payload=null;const output=new Headers()
  const adapter={setHeader(k,v){output.set(k,String(v));return this},status(n){status=n;return this},json(data){output.set('Content-Type','application/json');payload=JSON.stringify(data);return this},end(){return this}}
  await handler({...req,headers,body},adapter)
  return new Response(payload,{status,headers:output})
 })
 return sendWebResponse(result,res)
 }catch(error){res.statusCode=error?.message==='Body too large'?413:503;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({success:false,error:'تعذّر تنفيذ الطلب.'}))}
}}
