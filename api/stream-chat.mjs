// Members-only Stream Chat: verifies the Supabase session, then issues a short-lived
// Stream user token. The API secret never leaves the server.
import {jsonResponder,parseBody,supabaseConfig,OWNER_EMAIL} from './_shared/owner-ai.mjs'
import {MAJLIS_CALL} from './stream-video-config.mjs'

export const STREAM_BASE='https://chat.stream-io-api.com'
export const VIDEO_BASE='https://video.stream-io-api.com/api/v2/video'
export const MAJLIS={type:'messaging',id:'kumeel-majlis',name:'مجلس كميل'}
const SYSTEM_USER={id:'kumeel',name:'كميل',role:'admin'}
const TOKEN_TTL=60*60
const recent=new Map()
let channelReady=false

const b64url=bytes=>Buffer.from(bytes).toString('base64url')
export async function signJwt(payload,secret){
 const body=`${b64url(JSON.stringify({alg:'HS256',typ:'JWT'}))}.${b64url(JSON.stringify(payload))}`
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 return `${body}.${b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body))))}`
}

// Display names are public inside the room: 2–40 letters, no markup or control characters.
export function cleanName(value){
 if(typeof value!=='string')return null
 const name=value.normalize('NFC').replace(/\s+/g,' ').trim()
 return name.length>=2&&name.length<=40&&!/[<>\p{Cc}\p{Cf}]/u.test(name)&&/\p{L}/u.test(name)?name:null
}

async function verifyMember({authorization,fetcher,config=supabaseConfig}){
 if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,6000}$/.test(authorization))return {status:401,error:'سجّل الدخول لتنضم إلى المجلس.'}
 const response=await fetcher(`${config.url}/auth/v1/user`,{headers:{apikey:config.publishableKey,Authorization:authorization},signal:AbortSignal.timeout(8000)})
 if(!response.ok)return {status:401,error:'انتهت جلسة الدخول. سجّل الدخول مجددًا.'}
 const user=await response.json()
 if(typeof user?.id!=='string'||!/^[0-9a-f-]{36}$/i.test(user.id))return {status:401,error:'انتهت جلسة الدخول. سجّل الدخول مجددًا.'}
 if(!user.email_confirmed_at)return {status:403,error:'أكّد بريدك الإلكتروني أولًا لتنضم إلى المجلس.'}
 return {user}
}

export function createHandler({fetcher=fetch,env=process.env,clock=Date.now,limits=recent}={}){return async(req,res)=>{
 const fail=jsonResponder(res)
 if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'استخدم طلب POST.')}
 if(!env.STREAM_API_KEY||!env.STREAM_API_SECRET)return fail(503,'لم تُفعَّل الدردشة على الخادم بعد.')
 try{
  const member=await verifyMember({authorization:req.headers?.authorization,fetcher})
  if(!member.user)return fail(member.status,member.error)
  const {user}=member
  const name=cleanName(parseBody(req)?.name)
  if(!name)return fail(400,'اختر اسمًا يظهر في المجلس من ٢ إلى ٤٠ حرفًا.')
  const time=clock(),hits=limits.get(user.id)?.filter(t=>time-t<60_000)??[]
  if(hits.length>=6){res.setHeader('Retry-After','60');return fail(429,'محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.')}
  limits.set(user.id,[...hits,time])
  // Back-date iat a minute: Stream rejects tokens issued "in the future" when clocks drift.
  const now=Math.floor(time/1000),issued=now-60
  const server=await signJwt({server:true,iat:issued},env.STREAM_API_SECRET)
  const stream=async(path,body,base=STREAM_BASE)=>{
   const response=await fetcher(`${base}${path}?api_key=${encodeURIComponent(env.STREAM_API_KEY)}`,{method:'POST',headers:{Authorization:server,'Stream-Auth-Type':'jwt','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)})
   if(!response.ok)throw Object.assign(new Error('stream_request_failed'),{status:response.status,path})
  }
  const role=user.email?.toLowerCase()===OWNER_EMAIL?'admin':'user'
  await stream('/users',{users:{[SYSTEM_USER.id]:SYSTEM_USER,[user.id]:{id:user.id,name,role}}})
  if(!channelReady){
   await stream(`/channels/${MAJLIS.type}/${MAJLIS.id}/query`,{data:{created_by_id:SYSTEM_USER.id,custom:{name:MAJLIS.name}}})
   // The audio room belongs to the system user, so no member gets call-owner rights.
   await stream(`/call/${MAJLIS_CALL.type}/${MAJLIS_CALL.id}`,{data:{created_by_id:SYSTEM_USER.id}},VIDEO_BASE)
   channelReady=true
  }
  await stream(`/channels/${MAJLIS.type}/${MAJLIS.id}`,{add_members:[{user_id:user.id}]})
  const token=await signJwt({user_id:user.id,iat:issued,exp:now+TOKEN_TTL},env.STREAM_API_SECRET)
  return res.status(200).json({success:true,data:{apiKey:env.STREAM_API_KEY,userId:user.id,name,token,channel:{type:MAJLIS.type,id:MAJLIS.id},call:{type:MAJLIS_CALL.type,id:MAJLIS_CALL.id,host:role==='admin'}}})
 }catch(error){
  console.error('stream_chat_failed',{status:Number.isInteger(error?.status)?error.status:undefined,path:error?.path})
  channelReady=false
  return fail(error?.name==='TimeoutError'?504:502,'تعذّر الاتصال بخدمة الدردشة. أعد المحاولة لاحقًا.')
 }
}}
export default createHandler()
