import {loadEnv} from 'vite'
// Serves the owner-only AI endpoints during `vite dev` with the same handlers Vercel runs.
const routes={'/api/generate-idea':{module:'../api/generate-idea.mjs',maxBytes:6000},'/api/edit-assist':{module:'../api/edit-assist.mjs',maxBytes:40000}}
export default function geminiApiPlugin(mode){return {
 name:'local-gemini-api',
 configureServer(server){for(const [path,route] of Object.entries(routes))server.middlewares.use(path,async(req,res)=>{
  const send=(code,data)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
  try{
   const {createHandler}=await import(route.module);const env=loadEnv(mode,process.cwd(),'')
   let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>route.maxBytes)return send(413,{success:false,error:'Request too large'})}
   const response={setHeader:(key,value)=>res.setHeader(key,value),status(code){res.statusCode=code;return this},json(data){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}}
   await createHandler({env})({method:req.method,headers:req.headers,body:raw},response)
  }catch{send(500,{success:false,error:'Local API unavailable'})}
 })}
}}
