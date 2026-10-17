import {createClient} from '@supabase/supabase-js'
import config from '../../src/supabase-config.json' with {type:'json'}

const ACCESS='__Host-kumeel-access', REFRESH='__Host-kumeel-refresh', VERIFIER='__Host-kumeel-pkce'
const BASE='Path=/; Secure; HttpOnly; SameSite=Lax'
export function browserSession(request,{fetcher=fetch,refresh=true}={}){
 const cookies=new Map(),writes=new Map()
 for(const part of (request.headers.get('cookie')||'').split(';')){
  const at=part.indexOf('=');if(at<0)continue
  const name=part.slice(0,at).trim();if(cookies.has(name))continue
  try{cookies.set(name,decodeURIComponent(part.slice(at+1)))}catch{/* Ignore malformed cookies. */}
 }
 const write=(name,value,extra='')=>{if(value)cookies.set(name,value);else cookies.delete(name);writes.set(name,`${name}=${value?encodeURIComponent(value):''}; ${BASE}${value?extra:'; Max-Age=0'}`)}
 const clear=()=>{write(ACCESS,null);write(REFRESH,null);write(VERIFIER,null)}
 const storage={
  getItem(key){
   if(key.endsWith('-code-verifier'))return cookies.get(VERIFIER)||null
   try{
    const access_token=cookies.get(ACCESS),refresh_token=cookies.get(REFRESH)
    if(!access_token||!refresh_token||access_token.length>6000||refresh_token.length>512)return null
    // Untrusted claims supply refresh timing only; all authorization is verified upstream.
    const claims=JSON.parse(Buffer.from(access_token.split('.')[1],'base64url').toString())
    return JSON.stringify({access_token,refresh_token,expires_at:claims.exp,expires_in:0,token_type:'bearer',user:{id:claims.sub}})
   }catch{return null}
  },
  setItem(key,value){
   if(key.endsWith('-code-verifier')){write(VERIFIER,value,'; Max-Age=900');return}
   const session=JSON.parse(value)
   if(typeof session.access_token!=='string'||session.access_token.length>3800||typeof session.refresh_token!=='string'||session.refresh_token.length>512)throw Error('Invalid session size')
   write(ACCESS,session.access_token);write(REFRESH,session.refresh_token)
  },
  removeItem(key){if(key.endsWith('-code-verifier'))write(VERIFIER,null);else{write(ACCESS,null);write(REFRESH,null)}},
 }
 let instance
 const getClient=()=>instance??=createClient(config.url,config.publishableKey,{global:{fetch:(input,init)=>fetcher(input,{...init,redirect:'error',signal:init?.signal??AbortSignal.timeout(10000)})},auth:{storage,storageKey:'kumeel-server',flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}})
 async function verified(){
  if(!refresh){
   const access_token=cookies.get(ACCESS)
   if(!access_token)return null
   try{const claims=JSON.parse(Buffer.from(access_token.split('.')[1],'base64url').toString());if(!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000)return null}catch{return null}
   const headers={apikey:config.publishableKey,Authorization:`Bearer ${access_token}`}
   const identity=await fetcher(`${config.url}/auth/v1/user`,{headers,redirect:'error',signal:AbortSignal.timeout(10000)})
   if(identity.status===401||identity.status===403)return null
   if(!identity.ok)throw Error('Identity unavailable')
   const user=await identity.json()
   const active=await fetcher(`${config.url}/rest/v1/rpc/kumeel_has_active_session`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(10000)})
   if(!active.ok)throw Error('Session authorization unavailable')
   return await active.json()===true?{user,access_token}:null
  }
  const client=getClient()
  const {data,error}=await client.auth.getSession()
  if(error){if(error.status>=500||!error.status)throw Error('Session unavailable');clear();return null}
  if(!data.session)return null
  const user=await client.auth.getUser()
  if(user.error){if(user.error.status>=500||!user.error.status)throw Error('Identity unavailable');clear();return null}
  const active=await client.rpc('kumeel_has_active_session')
  if(active.error)throw Error('Session authorization unavailable')
  if(active.data!==true){clear();return null}
  return {user:user.data.user,access_token:data.session.access_token}
 }
 function apply(response){const next=new Response(response.body,response);next.headers.set('Cache-Control','private, no-store');next.headers.set('Pragma','no-cache');next.headers.set('Vary','Cookie');for(const cookie of writes.values())next.headers.append('Set-Cookie',cookie);return next}
 return {get client(){return getClient()},verified,apply,clear}
}
export function trustedBrowserRequest(request){
 const origin=new URL(request.url).origin
 if(request.headers.get('x-kumeel-bff')!=='1')return false
 const source=request.headers.get('origin'),site=request.headers.get('sec-fetch-site')
 return (!source||source===origin)&&(!site||site==='same-origin')&&(!['POST','PUT','PATCH','DELETE'].includes(request.method)||source===origin)
}
export const publicUser=user=>user?{id:user.id,email:user.email,email_confirmed_at:user.email_confirmed_at,created_at:user.created_at,app_metadata:{provider:'email'},user_metadata:{},aud:'authenticated'}:null
