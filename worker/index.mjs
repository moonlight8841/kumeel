import template from '../dist/template.html'
import {render,initialContent,validContent,readerContent,contentForPage,pageInfo,renderHead,replaceHead,publicPaths} from '../dist-ssr/entry-server.js'
import config from '../src/supabase-config.json' with {type:'json'}
import deploymentConfig from '../vercel.json' with {type:'json'}
import {createHandler as createChat,buildCorpus} from '../api/chat.mjs'
import {createHandler as createIdea} from '../api/generate-idea.mjs'
import {createHandler as createAssist} from '../api/edit-assist.mjs'

const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
const xmlEscape=value=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'})[char])
async function loadContent(){
 try{
  const response=await fetch(`${config.url}/rest/v1/kumeel_published?id=eq.main&select=content`,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(5000)})
  if(!response.ok)throw new Error('unavailable')
  const rows=await response.json()
  if(!validContent(rows[0]?.content))throw new Error('invalid')
  return {content:rows[0].content,fresh:true}
 }catch{
  console.warn(JSON.stringify({event:'published_content_unavailable'}))
  return {content:initialContent,fresh:false}
 }
}

// Adapt the existing, tested API handlers without sharing request environment state.
async function apiResponse(request,handler){
 const headers=Object.fromEntries(request.headers)
 // Only the trusted Cloudflare connecting address determines a visitor's quota.
 headers['x-forwarded-for']=request.headers.get('cf-connecting-ip')||'127.0.0.1'
 delete headers['x-vercel-forwarded-for']
 delete headers['x-real-ip']
 let body
 if(request.method==='POST'){
  const reader=request.body?.getReader();const chunks=[];let length=0
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>30000){await reader.cancel();return Response.json({success:false,error:'الطلب أكبر من المسموح.'},{status:413})}chunks.push(value)}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength}
  body=new TextDecoder().decode(bytes)
 }
 let status=200,payload=null
 const output=new Headers()
 const response={setHeader(key,value){output.set(key,String(value));return this},status(value){status=value;return this},json(value){output.set('Content-Type','application/json; charset=utf-8');payload=JSON.stringify(value);return this},send(value){payload=value;return this},end(){payload=null;return this}}
 await handler({method:request.method,headers,body},response)
 return new Response(request.method==='HEAD'?null:payload,{status,headers:output})
}

export async function handleRequest(request,env){
 const url=new URL(request.url)
 const path=url.pathname.replace(/\/+$/,'')||'/'
 const origin=env.SITE_URL||'https://kumeelalnahab.com'
 if(url.hostname==='www.kumeelalnahab.com'){const target=new URL(origin);target.pathname=url.pathname;target.search=url.search;return Response.redirect(target.toString(),308)}
 if(path==='/api/chat')return apiResponse(request,createChat({env,loadCorpus:async()=>buildCorpus(readerContent((await loadContent()).content))}))
 if(path==='/api/generate-idea')return apiResponse(request,createIdea({env}))
 if(path==='/api/edit-assist')return apiResponse(request,createAssist({env}))
 if(path.startsWith('/api/'))return Response.json({success:false,error:'المسار غير موجود.'},{status:404})
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}})
 if(path==='/robots.txt')return new Response(request.method==='HEAD'?null:`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /member\nSitemap: ${origin}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}})
 // Static resources bypass rendering; HTML routes always use current published data.
 if(/\.[a-z0-9]+$/i.test(path)&&!['/index.html','/sitemap.xml'].includes(path))return env.ASSETS.fetch(request)
 const {content,fresh}=await loadContent()
 const edition=path==='/admin'?content:readerContent(content)
 if(path==='/sitemap.xml'){
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths(edition).map(p=>`<url><loc>${xmlEscape(origin+p)}</loc></url>`).join('')}</urlset>`
  return new Response(request.method==='HEAD'?null:xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':fresh?'public, max-age=60':'no-store'}})
 }
 const pathname=path==='/index.html'?'/':path
 const info=pageInfo(edition,pathname)
 const scoped=contentForPage(edition,pathname)
 const markup=`<div id="root">${render(scoped,pathname)}</div><script type="application/json" id="kumeel-content">${safeJson(scoped)}</script>`
 const html=replaceHead(template,renderHead(edition,info,origin)).replace('<div id="root"></div>',()=>markup)
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}
 if(info.noindex)headers['X-Robots-Tag']='noindex, follow'
 return new Response(request.method==='HEAD'?null:html,{status:info.kind==='missing'?404:200,headers})
}

export default {async fetch(request,env){
 try{
  const response=await handleRequest(request,env)
  const secured=new Response(response.body,response)
  for(const {key,value} of deploymentConfig.headers[0].headers)secured.headers.set(key,value)
  return secured
 }catch{
  console.error(JSON.stringify({event:'request_failed'}))
  return Response.json({success:false,error:'تعذّر إكمال الطلب. حاول لاحقًا.'},{status:500})
 }
}}
