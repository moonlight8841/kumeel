import template from '../dist/template.html'
import {render,initialContent,validContent,readerContent,contentForPage,pageInfo,renderHead,replaceHead,publicPaths,documentLanguage,resolvePublishedTranslations} from '../dist-ssr/entry-server.js'
import config from '../src/supabase-config.json' with {type:'json'}
import deploymentConfig from '../vercel.json' with {type:'json'}
import {createHandler as createChat,buildCorpus} from '../api/chat.mjs'
import {createHandler as createIdea} from '../api/generate-idea.mjs'
import {createHandler as createAssist} from '../api/edit-assist.mjs'
import {createHandler as createStreamChat} from '../api/stream-chat.mjs'
import {createHandler as createA2A} from '../api/a2a.mjs'
import {createHandler as createMcp} from '../api/mcp.mjs'
import serverCard from '../public/.well-known/mcp/server-card.json' with {type:'json'}
import {wantsMarkdown,pageMarkdown,markdownTokens} from './markdown.mjs'

const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
const xmlEscape=value=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'})[char])
// llms.txt (https://llmstxt.org): a Markdown map of the public pages for AI tools, built from the sitemap's paths.
function llmsText(edition,origin){
 const pages=publicPaths(edition).filter(p=>p!=='/en'&&!p.startsWith('/en/')).map(p=>pageInfo(edition,p))
 const home=pageInfo(edition,'/')
 const line=info=>`- [${info.title.split(' | ')[0].replace(/[[\]]/g,'')}](${origin}${info.path}): ${info.description.replace(/\s+/g,' ')}`
 const sections=pages.filter(info=>info.path!=='/'&&!info.path.slice(1).includes('/'))
 const items=pages.filter(info=>info.path.slice(1).includes('/'))
 const tiktok=edition.site?.showTiktok&&/^[A-Za-z0-9._]{2,24}$/.test(edition.site.tiktok??'')?`\nOfficial profile: https://www.tiktok.com/@${edition.site.tiktok}\n`:''
 return `# ${home.title.split(' | ')[0]}\n\n> ${home.description}\n${tiktok}\nThe site is written in Arabic; English versions live under ${origin}/en/. Full page list: ${origin}/sitemap.xml\n\n## الأقسام\n\n${sections.map(line).join('\n')}\n\n## المحتوى\n\n${items.map(line).join('\n')}\n`
}
async function loadContent(){
 try{
  const response=await fetch(`${config.url}/rest/v1/kumeel_published?id=eq.main&select=content`,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(5000)})
  if(!response.ok)throw new Error('unavailable')
  const rows=await response.json()
  if(!validContent(rows[0]?.content))throw new Error('invalid')
  return {content:await resolvePublishedTranslations(rows[0].content),fresh:true}
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
 const readerChat=()=>createChat({env,loadCorpus:async()=>buildCorpus(readerContent((await loadContent()).content))})
 if(path==='/api/chat')return apiResponse(request,readerChat())
 if(path==='/api/a2a')return apiResponse(request,createA2A({chat:readerChat(),origin}))
 if(path==='/api/mcp/server-card')return Response.json(serverCard,{headers:{'Cache-Control':'public, max-age=3600'}})
 if(path==='/api/mcp')return apiResponse(request,createMcp({chat:readerChat(),origin,site:async()=>{
  const edition=readerContent((await loadContent()).content)
  const paths=publicPaths(edition)
  const pages=paths.map(p=>{const info=pageInfo(edition,p);return {path:p,title:info.title.split(' | ')[0],description:info.description}})
  const corpus=buildCorpus(edition)
  // Library books and sections live outside the chat corpus; search their titles and descriptions too.
  const covered=new Set(corpus.map(d=>d.href))
  return {
   corpus:[...corpus,...pages.filter(p=>!covered.has(p.path)&&p.path!=='/en'&&!p.path.startsWith('/en/')).map(p=>({id:`p:${p.path}`,title:p.title,href:p.path,body:p.description}))],
   pages,
   page:async p=>paths.includes(p)?pageMarkdown(render(contentForPage(edition,p),p),pageInfo(edition,p),origin):null,
  }
 }}))
 if(path==='/api/generate-idea')return apiResponse(request,createIdea({env}))
 if(path==='/api/edit-assist')return apiResponse(request,createAssist({env}))
 if(path==='/api/stream-chat')return apiResponse(request,createStreamChat({env}))
 if(path.startsWith('/api/'))return Response.json({success:false,error:'المسار غير موجود.'},{status:404})
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}})
 // RFC 9727 API catalog: the two public agent APIs and where they are described.
 if(path==='/.well-known/api-catalog')return new Response(request.method==='HEAD'?null:JSON.stringify({linkset:[
  {anchor:`${origin}/api/mcp`,'service-desc':[{href:`${origin}/.well-known/mcp/server-card.json`,type:'application/json'}],'service-doc':[{href:`${origin}/.well-known/agent-skills/kumeel-reading/SKILL.md`,type:'text/markdown'}]},
  {anchor:`${origin}/api/a2a`,'service-desc':[{href:`${origin}/.well-known/agent-card.json`,type:'application/json'}],'service-doc':[{href:`${origin}/.well-known/agent-skills/kumeel-reading/SKILL.md`,type:'text/markdown'}]},
 ]}),{headers:{'Content-Type':'application/linkset+json','Cache-Control':'public, max-age=3600'}})
 if(path==='/robots.txt')return new Response(request.method==='HEAD'?null:`User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\nDisallow: /admin\nDisallow: /member\nSitemap: ${origin}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}})
 // Static resources bypass rendering; HTML routes always use current published data.
 if(/\.[a-z0-9]+$/i.test(path)&&!['/index.html','/sitemap.xml','/llms.txt'].includes(path))return env.ASSETS.fetch(request)
 const {content,fresh}=await loadContent()
 const edition=path==='/admin'?content:readerContent(content)
 if(path==='/sitemap.xml'){
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths(edition).map(p=>`<url><loc>${xmlEscape(origin+p)}</loc></url>`).join('')}</urlset>`
  return new Response(request.method==='HEAD'?null:xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':fresh?'public, max-age=60':'no-store'}})
 }
 if(path==='/llms.txt')return new Response(request.method==='HEAD'?null:llmsText(edition,origin),{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':fresh?'public, max-age=300':'no-store'}})
 const pathname=path==='/index.html'?'/':path
 const info=pageInfo(edition,pathname)
 const scoped=contentForPage(edition,pathname)
 const body=render(scoped,pathname)
 const status=info.kind==='missing'?404:200
 if(wantsMarkdown(request)){
  const md=pageMarkdown(body,info,origin)
  const headers={'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'no-store','Vary':'Accept','x-markdown-tokens':String(markdownTokens(md))}
  if(info.noindex)headers['X-Robots-Tag']='noindex, follow'
  return new Response(request.method==='HEAD'?null:md,{status,headers})
 }
 const markup=`<div id="root">${body}</div><script type="application/json" id="kumeel-content">${safeJson(scoped)}</script>`
 const html=documentLanguage(replaceHead(template,renderHead(edition,info,origin)).replace('<div id="root"></div>',()=>markup),pathname)
 // RFC 8288 discovery links for agents; the page itself is also available as Markdown via Accept.
 const links=`<${origin}/llms.txt>; rel="describedby"; type="text/markdown", <${origin}/.well-known/agent-skills/index.json>; rel="describedby"; type="application/json", <${origin}/sitemap.xml>; rel="sitemap"; type="application/xml", <${origin}/.well-known/api-catalog>; rel="api-catalog",<${origin}${info.path}>; rel="alternate"; type="text/markdown"`
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Vary':'Accept','Link':links}
 if(info.noindex)headers['X-Robots-Tag']='noindex, follow'
 return new Response(request.method==='HEAD'?null:html,{status,headers})
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
