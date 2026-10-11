import {loadEnv} from 'vite'
export default function geminiApiPlugin(mode){return {
 name:'local-gemini-api',
 configureServer(server){server.middlewares.use('/api/generate-idea',async(req,res)=>{
 try{
  const {createHandler}=await import('../api/generate-idea.mjs');const env=loadEnv(mode,process.cwd(),'')
  let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>6000){res.statusCode=413;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:false,error:'Request too large'}));return}}
  const response={setHeader:(key,value)=>res.setHeader(key,value),status(code){res.statusCode=code;return this},json(data){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}}
  await createHandler({env})({method:req.method,headers:req.headers,body:raw},response)
 }catch{res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:false,error:'Local API unavailable'}))}
 })}
}}
