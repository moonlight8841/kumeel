// A2A (v1.0, JSON-RPC binding): lets other agents ask the reader chat about the site's writings.
// Stateless and single-turn; every call goes through the chat handler, so its quotas and grounding apply unchanged.
import {randomUUID} from 'node:crypto'
import {LIMITS} from './chat.mjs'

const rpc=(res,id,payload,status=200)=>res.status(status).json({jsonrpc:'2.0',id:id??null,...payload})
const failure=(res,id,code,message,status)=>rpc(res,id,{error:{code,message}},status)
const tasks=new Set(['GetTask','ListTasks','CancelTask','SubscribeToTask','tasks/get','tasks/cancel','tasks/resubscribe'])

function questionText(message){
 if(!message||typeof message!=='object'||!Array.isArray(message.parts))return null
 if(message.role&&!['ROLE_USER','user'].includes(message.role))return null
 // v1.0 parts carry `text` directly; v0.3 clients also send kind:"text".
 const text=message.parts.filter(p=>p&&typeof p.text==='string').map(p=>p.text).join('\n').trim()
 return text&&text.length<=LIMITS.message?text:null
}

// Calls the chat handler in-process and captures its JSON response; also used by the MCP server.
export async function askChat(chat,req,text){
 let status=200,body=null
 const headers={}
 const res={setHeader(key,value){headers[key.toLowerCase()]=String(value);return this},status(value){status=value;return this},json(value){body=value;return this},send(value){body=value;return this},end(){return this}}
 await chat({method:'POST',headers:{...req.headers,'content-type':'application/json','content-length':'0'},body:JSON.stringify({messages:[{role:'user',text}],locale:/[؀-ۿ]/.test(text)?'ar':'en'})},res)
 return {status,body,headers}
}

export function createHandler({chat,origin='https://kumeelalnahab.com'}){return async(req,res)=>{
 if(req.method!=='POST'){res.setHeader('Allow','POST');return failure(res,null,-32600,`Send JSON-RPC 2.0 POST requests. Agent card: ${origin}/.well-known/agent-card.json`,405)}
 let call
 try{call=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return failure(res,null,-32700,'Invalid JSON payload')}
 if(!call||call.jsonrpc!=='2.0'||typeof call.method!=='string')return failure(res,call?.id,-32600,'Request payload validation error')
 if(tasks.has(call.method))return failure(res,call.id,-32001,'Task not found: this agent answers synchronously and keeps no tasks')
 if(!['SendMessage','message/send'].includes(call.method))return failure(res,call.id,-32601,'Method not found')
 const message=call.params?.message
 const text=questionText(message)
 if(!text)return failure(res,call.id,-32602,`Invalid parameters: send one user message with a text part of up to ${LIMITS.message} characters`)
 const {status,body,headers}=await askChat(chat,req,text)
 if(status!==200||!body?.success){
  if(headers['retry-after'])res.setHeader('Retry-After',headers['retry-after'])
  return failure(res,call.id,-32603,body?.error||'Internal error',status===429?429:200)
 }
 const {answer,sources,followUp}=body.data
 const links=sources.map(s=>`- ${s.title}: ${new URL(s.href,origin)}`).join('\n')
 const reply=[answer,links&&`\n${links}`,followUp&&`\n${followUp}`].filter(Boolean).join('\n')
 return rpc(res,call.id,{result:{message:{messageId:randomUUID(),contextId:typeof message.contextId==='string'?message.contextId:randomUUID(),role:'ROLE_AGENT',parts:[{text:reply,mediaType:'text/plain'},{data:{answer,sources:sources.map(s=>({title:s.title,url:new URL(s.href,origin).toString()})),followUp},mediaType:'application/json'}]}}})
}}
