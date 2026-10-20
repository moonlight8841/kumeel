// Read-only MCP server (Streamable HTTP, stateless JSON responses) over the site's published content.
// Every tool reads public data only; `ask_writings` goes through the reader chat and its quotas.
import {askChat} from './a2a.mjs'
import {LIMITS} from './chat.mjs'

export const PROTOCOL_VERSIONS=['2025-11-25','2025-06-18','2025-03-26']
export const SERVER_INFO={name:'kumeel-writings',title:'Kumeel Al Nahab — writings',version:'1.0.0'}
const PAGE_LIMIT=60000

const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
export const TOOLS=[
 {name:'list_pages',title:'List public pages',description:'List the public pages of kumeelalnahab.com (sections, writings, library books) with titles and descriptions. Arabic by default; English pages live under /en/.',inputSchema:{type:'object',properties:{language:{type:'string',enum:['ar','en'],description:'Page language (default ar).'}},additionalProperties:false},annotations:readOnly},
 {name:'get_page',title:'Read a page as Markdown',description:'Return one public page as clean Markdown with title, description and canonical URL. Use paths from list_pages, e.g. /writings/peace-and-conflict.',inputSchema:{type:'object',properties:{path:{type:'string',description:'Site path or full https://kumeelalnahab.com URL.',maxLength:300}},required:['path'],additionalProperties:false},annotations:readOnly},
 {name:'search_writings',title:'Search the writings',description:'Keyword search across published writings, ideas, sessions, discoveries and library books. Returns titles, URLs and snippets.',inputSchema:{type:'object',properties:{query:{type:'string',minLength:2,maxLength:200},limit:{type:'integer',minimum:1,maximum:10,description:'Default 5.'}},required:['query'],additionalProperties:false},annotations:readOnly},
 {name:'ask_writings',title:'Ask the writings',description:`Ask one question (up to ${LIMITS.message} characters) and get a short answer grounded only in the site's texts, with cited pages. Rate limited per client and per day.`,inputSchema:{type:'object',properties:{question:{type:'string',minLength:2,maxLength:LIMITS.message}},required:['question'],additionalProperties:false},annotations:{...readOnly,idempotentHint:false}},
]

// Arabic-aware folding so "الإنسان" matches "الانسان" and diacritics are ignored.
const fold=text=>String(text).toLowerCase().normalize('NFKC').replace(/[ً-ٰٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
export function searchCorpus(corpus,query,limit=5){
 const terms=[...new Set(fold(query).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>1))]
 if(!terms.length)return []
 const docs=corpus.map(doc=>({doc,title:fold(doc.title),body:fold(doc.body)}))
 // Rarer terms weigh more, so a common word like "الفلسفة" does not drown out a specific one.
 const weight=Object.fromEntries(terms.map(t=>[t,Math.log(1+docs.length/(1+docs.filter(d=>d.title.includes(t)||d.body.includes(t)).length))]))
 return docs.map(({doc,title,body})=>{
  const score=terms.reduce((sum,t)=>sum+weight[t]*((title.includes(t)?3:0)+(body.includes(t)?1:0)),0)
  const at=Math.max(0,Math.min(...terms.map(t=>body.indexOf(t)).filter(i=>i>=0),body.length)-60)
  return {doc,score,snippet:doc.body.slice(at,at+220).trim()}
 }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,limit)
}

const text=(value,structured)=>({content:[{type:'text',text:value}],...(structured?{structuredContent:structured}:{})})
const toolError=message=>({content:[{type:'text',text:message}],isError:true})

export function createHandler({site,chat,origin='https://kumeelalnahab.com'}){
 const sitePath=value=>{
  if(typeof value!=='string')return null
  try{const url=new URL(value.trim(),origin+'/');if(url.origin!==origin)return null;return url.pathname.replace(/\/+$/,'')||'/'}catch{return null}
 }
 const tools={
  async list_pages({language='ar'},s){
   if(!['ar','en'].includes(language))return toolError('language must be "ar" or "en".')
   const pages=s.pages.filter(p=>(p.path==='/en'||p.path.startsWith('/en/'))===(language==='en')).map(p=>({title:p.title,url:origin+p.path,description:p.description}))
   return text(pages.map(p=>`- [${p.title}](${p.url}): ${p.description}`).join('\n'),{pages})
  },
  async get_page({path},s){
   const target=sitePath(path)
   const markdown=target&&await s.page(target)
   if(!markdown)return toolError('Not a public page. Use list_pages to find valid paths.')
   return text(markdown.length>PAGE_LIMIT?markdown.slice(0,PAGE_LIMIT)+'\n\n[truncated]':markdown)
  },
  async search_writings({query,limit=5},s){
   if(typeof query!=='string'||query.trim().length<2||query.length>200)return toolError('query must be 2–200 characters.')
   const results=searchCorpus(s.corpus,query,Math.min(10,Math.max(1,Number.isInteger(limit)?limit:5))).map(r=>({title:r.doc.title,url:new URL(r.doc.href,origin+'/').toString(),snippet:r.snippet}))
   return text(results.length?results.map(r=>`- [${r.title}](${r.url}): ${r.snippet}`).join('\n'):'No matches.',{results})
  },
  async ask_writings({question},s,req){
   if(typeof question!=='string'||question.trim().length<2||question.length>LIMITS.message)return toolError(`question must be 2–${LIMITS.message} characters.`)
   const {status,body}=await askChat(chat,req,question.trim())
   if(status!==200||!body?.success)return toolError(body?.error||'The reader chat is unavailable right now.')
   const {answer,sources,followUp}=body.data
   const cited=sources.map(x=>({title:x.title,url:new URL(x.href,origin+'/').toString()}))
   return text([answer,...cited.map(x=>`- ${x.title}: ${x.url}`),followUp].filter(Boolean).join('\n'),{answer,sources:cited,followUp})
  },
 }
 const reply=(res,id,payload,status=200)=>res.status(status).json({jsonrpc:'2.0',id:id??null,...payload})
 const fail=(res,id,code,message,status=200)=>reply(res,id,{error:{code,message}},status)

 return async(req,res)=>{
  // DNS-rebinding guard from the MCP transport spec: browsers may only call from our own origin.
  const browserOrigin=req.headers?.origin
  if(browserOrigin&&browserOrigin!==origin)return fail(res,null,-32600,'Origin not allowed',403)
  if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(res,null,-32600,'This stateless server accepts JSON-RPC over POST only',405)}
  const version=req.headers?.['mcp-protocol-version']
  if(version&&!PROTOCOL_VERSIONS.includes(version))return fail(res,null,-32600,`Unsupported MCP-Protocol-Version. Supported: ${PROTOCOL_VERSIONS.join(', ')}`,400)
  let call
  try{call=typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return fail(res,null,-32700,'Parse error',400)}
  if(!call||Array.isArray(call)||call.jsonrpc!=='2.0')return fail(res,call?.id,-32600,'Invalid Request',400)
  // Notifications and client responses carry no reply.
  if(call.id===undefined||call.method===undefined)return res.status(202).end()
  const params=call.params&&typeof call.params==='object'?call.params:{}
  switch(call.method){
   case 'initialize':{
    const requested=params.protocolVersion
    return reply(res,call.id,{result:{protocolVersion:PROTOCOL_VERSIONS.includes(requested)?requested:PROTOCOL_VERSIONS[0],capabilities:{tools:{listChanged:false}},serverInfo:SERVER_INFO,instructions:'Read-only access to the published Arabic-first writings of Kumeel Al Nahab. Cite page URLs. Content signals: search=yes, ai-input=yes, ai-train=no.'}})
   }
   case 'ping':return reply(res,call.id,{result:{}})
   case 'tools/list':return reply(res,call.id,{result:{tools:TOOLS}})
   case 'tools/call':{
    const tool=tools[params.name]
    if(!tool)return fail(res,call.id,-32602,`Unknown tool: ${params.name}`)
    const args=params.arguments&&typeof params.arguments==='object'&&!Array.isArray(params.arguments)?params.arguments:{}
    try{return reply(res,call.id,{result:await tool(args,await site(),req)})}
    catch{return reply(res,call.id,{result:toolError('The tool failed. Try again later.')})}
   }
   default:return fail(res,call.id,-32601,'Method not found')
  }
 }
}
