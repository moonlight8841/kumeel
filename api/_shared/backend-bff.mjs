import config from '../../src/supabase-config.json' with {type:'json'}
import {browserSession,trustedBrowserRequest} from './browser-session.mjs'
import {boundedText} from './auth-bff.mjs'
const tables=new Set(['kumeel_published','kumeel_drafts','kumeel_editors','kumeel_community_posts','kumeel_public_comments','kumeel_submissions','kumeel_community_comments','kumeel_public_writing_responses','kumeel_writing_responses','kumeel_sparring','kumeel_teacher_applications','kumeel_teacher_profiles'])
const procedures=new Set(['kumeel_is_secure_editor','kumeel_save_submission','kumeel_review_community','kumeel_send_comment','kumeel_send_writing_response','kumeel_review_writing_response','kumeel_save_sparring','kumeel_delete_sparring','kumeel_apply_teacher','kumeel_review_teacher'])
const publicTables=new Set(['kumeel_published','kumeel_community_posts','kumeel_public_comments','kumeel_public_writing_responses','kumeel_teacher_profiles'])
export async function handleBackend(request,{fetcher=fetch}={}){
 const fail=(status)=>Response.json({message:status===401?'سجّل الدخول مجددًا.':'تعذّر تنفيذ الطلب.',code:'BACKEND_REJECTED'},{status,headers:{'Cache-Control':'private, no-store'}})
 if(!trustedBrowserRequest(request))return fail(403)
 const raw=new URL(request.url).searchParams.get('path')||''
 if(raw.length>10000||raw.includes('\\')||raw.includes('#')||raw.includes('..'))return fail(400)
 const [path,query='']=raw.split('?')
 if(path.includes('%'))return fail(400)
 const parts=path.split('/'),table=parts[3]
 const isTable=parts.length===4&&parts[1]==='rest'&&parts[2]==='v1'&&tables.has(table)
 const isRpc=parts.length===5&&parts[1]==='rest'&&parts[2]==='v1'&&parts[3]==='rpc'&&procedures.has(parts[4])
 const isUpload=/^\/storage\/v1\/object\/kumeel-media\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp|mp4|webm)$/.test(path)
 if(!isTable&&!isRpc&&!isUpload)return fail(404)
 if(!(isUpload?['POST']:isRpc?['POST']:['GET','HEAD','POST','PATCH','DELETE']).includes(request.method))return fail(405)
 const publicRead=isTable&&publicTables.has(table)&&['GET','HEAD'].includes(request.method)
 const context=browserSession(request,{fetcher,refresh:false})
 try{
  const identity=await context.verified()
  if(!identity&&!publicRead)return context.apply(fail(401))
  if(isUpload){const owner=await fetcher(`${config.url}/rest/v1/rpc/kumeel_is_secure_editor`,{method:'POST',headers:{apikey:config.publishableKey,Authorization:`Bearer ${identity.access_token}`,'Content-Type':'application/json'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(10000)});if(!owner.ok||await owner.json()!==true)return context.apply(fail(403))}
  const headers=new Headers({apikey:config.publishableKey})
  if(identity)headers.set('Authorization',`Bearer ${identity.access_token}`)
  for(const key of ['accept','content-type','prefer','range','range-unit','x-upsert','cache-control']){const value=request.headers.get(key);if(value)headers.set(key,value)}
  // All browser queries are constrained to the public API schema and a fixed upstream.
  const target=new URL(path,config.url);target.search=query
  let body
  if(!['GET','HEAD'].includes(request.method)){
   if(isUpload){
    const maximum=50*1024*1024+65536
    if(Number(request.headers.get('content-length'))>maximum)return context.apply(fail(413))
    let size=0
    body=request.body?.pipeThrough(new TransformStream({transform(chunk,controller){size+=chunk.byteLength;if(size>maximum)throw Error('Body too large');controller.enqueue(chunk)}}))
   }else body=await boundedText(request,3*1024*1024)
  }
  const upstream=await fetcher(target,{method:request.method,headers,body,duplex:'half',redirect:'manual',signal:AbortSignal.timeout(isUpload?90000:20000)})
  if(upstream.status>=300&&upstream.status<400)throw Error('Unexpected upstream redirect')
  const output=new Headers()
  for(const key of ['content-type','content-range','range-unit','preference-applied']){const value=upstream.headers.get(key);if(value)output.set(key,value)}
  // PostgREST body contains application records only; Auth and token RPCs are not allowlisted.
  return context.apply(new Response(upstream.body,{status:upstream.status,headers:output}))
 }catch(error){return context.apply(fail(error?.message==='Body too large'?413:503))}
}
export async function ownerBrowserRequest(request,handler,{fetcher=fetch}={}){
 if(request.method!=='POST')return handler(request)
 if(!trustedBrowserRequest(request))return Response.json({success:false,error:'مصدر الطلب غير معتمد.'},{status:403,headers:{'Cache-Control':'no-store'}})
 const context=browserSession(request,{fetcher,refresh:false})
 try{
  const identity=await context.verified()
  if(!identity)return context.apply(Response.json({success:false,error:'سجّل الدخول بحساب الإدارة.'},{status:401}))
  const headers=new Headers(request.headers);headers.set('Authorization',`Bearer ${identity.access_token}`)
  return context.apply(await handler(new Request(request,{headers})))
 }catch{return context.apply(Response.json({success:false,error:'تعذّر التحقق من الجلسة.'},{status:503}))}
}
