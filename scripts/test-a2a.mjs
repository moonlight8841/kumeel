import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {createHandler} from '../api/a2a.mjs'

function respond(){const r={statusCode:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},status(s){this.statusCode=s;return this},json(v){this.body=v;return this}};return r}
// Stands in for the reader chat handler and records what A2A forwarded to it.
function fakeChat({status=200,body={success:true,data:{answer:'جواب',sources:[{title:'السلام والصراع',href:'/writings/peace-and-conflict'}],followUp:'وماذا بعد؟'}},headers={}}={}){
 const calls=[]
 const chat=async(req,res)=>{calls.push(req);for(const [k,v] of Object.entries(headers))res.setHeader(k,v);return res.status(status).json(body)}
 return {chat,calls}
}
const send=(text,extra={})=>JSON.stringify({jsonrpc:'2.0',id:7,method:'SendMessage',params:{message:{messageId:'m1',role:'ROLE_USER',parts:[{text}],...extra}}})
const call=async(handler,body,method='POST')=>{const res=respond();await handler({method,headers:{'x-forwarded-for':'203.0.113.9'},body},res);return res}

test('SendMessage forwards one question to the chat and returns a cited agent message', async()=>{
 const {chat,calls}=fakeChat()
 const res=await call(createHandler({chat,origin:'https://kumeel.example'}),send('ما السلام؟',{contextId:'ctx-1'}))
 assert.equal(res.statusCode,200)
 const message=res.body.result.message
 assert.equal(res.body.id,7)
 assert.equal(message.role,'ROLE_AGENT')
 assert.equal(message.contextId,'ctx-1')
 assert.match(message.parts[0].text,/جواب[\s\S]*https:\/\/kumeel\.example\/writings\/peace-and-conflict[\s\S]*وماذا بعد؟/)
 assert.equal(message.parts[1].data.sources[0].url,'https://kumeel.example/writings/peace-and-conflict')
 const forwarded=JSON.parse(calls[0].body)
 assert.deepEqual(forwarded.messages,[{role:'user',text:'ما السلام؟'}])
 assert.equal(forwarded.locale,'ar')
 assert.equal(calls[0].headers['x-forwarded-for'],'203.0.113.9','Quota still keys on the caller')
})

test('Legacy message/send with kind:text parts is accepted; English questions get English answers', async()=>{
 const {chat,calls}=fakeChat()
 const res=await call(createHandler({chat}),JSON.stringify({jsonrpc:'2.0',id:'a',method:'message/send',params:{message:{role:'user',parts:[{kind:'text',text:'What is certainty?'}]}}}))
 assert.ok(res.body.result.message)
 assert.equal(JSON.parse(calls[0].body).locale,'en')
})

test('Protocol errors use JSON-RPC codes and never reach the chat', async()=>{
 const {chat,calls}=fakeChat()
 const handler=createHandler({chat})
 assert.equal((await call(handler,'{bad')).body.error.code,-32700)
 assert.equal((await call(handler,JSON.stringify({id:1,method:'SendMessage'}))).body.error.code,-32600)
 assert.equal((await call(handler,JSON.stringify({jsonrpc:'2.0',id:1,method:'Nope'}))).body.error.code,-32601)
 assert.equal((await call(handler,JSON.stringify({jsonrpc:'2.0',id:1,method:'GetTask',params:{id:'x'}}))).body.error.code,-32001)
 assert.equal((await call(handler,send(''))).body.error.code,-32602)
 assert.equal((await call(handler,send('x'.repeat(601)))).body.error.code,-32602)
 assert.equal((await call(handler,JSON.stringify({jsonrpc:'2.0',id:1,method:'SendMessage',params:{message:{role:'ROLE_AGENT',parts:[{text:'hi'}]}}}))).body.error.code,-32602)
 const get=await call(handler,undefined,'GET')
 assert.equal(get.statusCode,405)
 assert.equal(calls.length,0)
})

test('Chat limits surface as rate-limit errors with Retry-After', async()=>{
 const {chat}=fakeChat({status:429,body:{success:false,error:'limit'},headers:{'Retry-After':'60'}})
 const res=await call(createHandler({chat}),send('سؤال'))
 assert.equal(res.statusCode,429)
 assert.equal(res.headers['Retry-After'],'60')
 assert.equal(res.body.error.code,-32603)
})

test('Agent card declares the JSON-RPC interface and skills', async()=>{
 const card=JSON.parse(await readFile('public/.well-known/agent-card.json','utf8'))
 for(const key of ['name','description','version','capabilities','defaultInputModes','defaultOutputModes'])assert.ok(card[key],key)
 assert.deepEqual(card.supportedInterfaces[0],{url:'https://kumeelalnahab.com/api/a2a',protocolBinding:'JSONRPC',protocolVersion:'1.0'})
 assert.ok(card.skills.length&&card.skills.every(s=>s.id&&s.name&&s.description))
})
