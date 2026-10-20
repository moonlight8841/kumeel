import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {createHandler,searchCorpus,TOOLS,PROTOCOL_VERSIONS} from '../api/mcp.mjs'

const origin='https://kumeel.example'
const site=async()=>({
 corpus:[{id:'w:peace',title:'السلام والصراع',href:'/writings/peace-and-conflict',body:'[تأملات] هنا كان السلام وهنا كان الصراع'},{id:'b:republic',title:'Republic',href:'/library/republic',body:'Plato — قراءة حوارية في العدالة'}],
 pages:[{path:'/',title:'الرئيسية',description:'d'},{path:'/writings/peace-and-conflict',title:'السلام والصراع',description:'تأمل'},{path:'/en/',title:'Home',description:'en'}],
 page:async p=>p==='/writings/peace-and-conflict'?'---\ntitle: "x"\n---\n\n# السلام والصراع\n':null,
})
function respond(){const r={statusCode:0,headers:{},body:null,ended:false,setHeader(k,v){this.headers[k]=v;return this},status(s){this.statusCode=s;return this},json(v){this.body=v;return this},end(){this.ended=true;return this}};return r}
const chats=[]
const chat=async(req,res)=>{chats.push(req);return res.status(200).json({success:true,data:{answer:'جواب',sources:[{title:'السلام والصراع',href:'/writings/peace-and-conflict'}],followUp:''}})}
const handler=createHandler({site,chat,origin})
async function rpc(method,params,{headers={},id=1}={}){const res=respond();await handler({method:'POST',headers:{'x-forwarded-for':'203.0.113.5',...headers},body:JSON.stringify({jsonrpc:'2.0',...(id===null?{}:{id}),method,...(params?{params}:{})})},res);return res}
const tool=async(name,args)=>(await rpc('tools/call',{name,arguments:args})).body.result

test('initialize negotiates the protocol version and declares tools only', async()=>{
 const res=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'t',version:'1'}})
 assert.equal(res.body.result.protocolVersion,'2025-06-18')
 assert.deepEqual(res.body.result.capabilities,{tools:{listChanged:false}})
 assert.equal((await rpc('initialize',{protocolVersion:'1999-01-01'})).body.result.protocolVersion,PROTOCOL_VERSIONS[0])
 const note=await rpc('notifications/initialized',undefined,{id:null})
 assert.equal(note.statusCode,202)
 assert.ok(note.ended)
})

test('Every tool is declared read-only with a closed input schema', async()=>{
 const listed=(await rpc('tools/list')).body.result.tools
 assert.deepEqual(listed.map(t=>t.name),['list_pages','get_page','search_writings','ask_writings'])
 assert.ok(TOOLS.every(t=>t.annotations.readOnlyHint&&!t.annotations.destructiveHint&&t.inputSchema.additionalProperties===false))
})

test('list_pages, get_page and search_writings return only public content', async()=>{
 const ar=await tool('list_pages',{})
 assert.deepEqual(ar.structuredContent.pages.map(p=>p.url),[`${origin}/`,`${origin}/writings/peace-and-conflict`])
 assert.equal((await tool('list_pages',{language:'en'})).structuredContent.pages[0].url,`${origin}/en/`)
 assert.match((await tool('get_page',{path:`${origin}/writings/peace-and-conflict/`})).content[0].text,/# السلام والصراع/)
 for(const path of ['/admin','https://evil.example/writings/peace-and-conflict','/member',42])assert.equal((await tool('get_page',{path})).isError,true,String(path))
 const found=await tool('search_writings',{query:'الصّراع'})
 assert.equal(found.structuredContent.results[0].url,`${origin}/writings/peace-and-conflict`,'Diacritics are folded')
 assert.equal((await tool('search_writings',{query:'x'})).isError,true)
 assert.equal(searchCorpus((await site()).corpus,'العداله',5)[0].doc.id,'b:republic','Ta marbuta folds')
})

test('ask_writings forwards the caller through the chat quota and cites pages', async()=>{
 const result=await tool('ask_writings',{question:'ما السلام؟'})
 assert.match(result.content[0].text,/جواب[\s\S]*https:\/\/kumeel\.example\/writings\/peace-and-conflict/)
 assert.equal(chats.at(-1).headers['x-forwarded-for'],'203.0.113.5')
 assert.equal((await tool('ask_writings',{question:'x'.repeat(601)})).isError,true)
})

test('Transport guards: origin, method, version header, malformed input, unknown method', async()=>{
 assert.equal((await rpc('ping',undefined,{headers:{origin:'https://evil.example'}})).statusCode,403)
 assert.equal((await rpc('ping',undefined,{headers:{origin}})).body.result && 200,200)
 assert.equal((await rpc('ping',undefined,{headers:{'mcp-protocol-version':'1999-01-01'}})).statusCode,400)
 const get=respond();await handler({method:'GET',headers:{}},get);assert.equal(get.statusCode,405)
 const bad=respond();await handler({method:'POST',headers:{},body:'{oops'},bad);assert.equal(bad.body.error.code,-32700)
 const batch=respond();await handler({method:'POST',headers:{},body:'[]'},batch);assert.equal(batch.body.error.code,-32600)
 assert.equal((await rpc('resources/list')).body.error.code,-32601)
 assert.equal((await rpc('tools/call',{name:'drop_tables'})).body.error.code,-32602)
})

test('Discovery documents agree with the server', async()=>{
 const card=JSON.parse(await readFile('public/.well-known/mcp/server-card.json','utf8'))
 assert.equal(card.remotes[0].url,'https://kumeelalnahab.com/api/mcp')
 assert.deepEqual(card.remotes[0].supportedProtocolVersions,PROTOCOL_VERSIONS)
 assert.deepEqual(card.tools,TOOLS.map(t=>t.name))
 assert.match(card.name,/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/)
 assert.ok(card.description.length<=100)
})
