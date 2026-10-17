import type {User,AuthChangeEvent,Factor,AuthError} from '@supabase/supabase-js'
export type BrowserSession={user:User}
type Reply<T>={data:T;error:AuthError|null;event?:AuthChangeEvent}
type Listener=(event:AuthChangeEvent,session:BrowserSession|null)=>void
let refreshBrowserSession:()=>Promise<boolean>=async()=>false
export function createBrowserAuth(){
 let session:BrowserSession|null=null,initialized:Promise<void>|null=null
 const listeners=new Set<Listener>()
 const channel=typeof window!=='undefined'&&typeof BroadcastChannel!=='undefined'?new BroadcastChannel('kumeel-auth-state-v3'):null
 function emit(event:AuthChangeEvent){for(const listener of listeners)listener(event,session)}
 async function call<T>(action:string,args:unknown={}):Promise<Reply<T>>{
  try{
   const reset=typeof location!=='undefined'&&new URLSearchParams(location.search).get('reset')==='1'
   const perform=async()=>{
   const response=await fetch('/api/auth'+(reset?'?reset=1':''),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Kumeel-BFF':'1'},body:JSON.stringify({action,args})})
   const result=await response.json()
   if(result.error){if(result.error.status===401&&session){session=null;emit('SIGNED_OUT')}return {data:null as T,error:result.error}}
   if(result.data&&Object.prototype.hasOwnProperty.call(result.data,'session'))session=result.data.session
   if(result.event){if(result.event==='SIGNED_OUT')session=null;emit(result.event);channel?.postMessage('changed')}
   return result
   }
   return await (typeof navigator!=='undefined'&&navigator.locks?navigator.locks.request('kumeel-auth-cookie',perform):perform())
  }catch{return {data:null as T,error:{name:'AuthError',message:'Network request failed',status:503,code:'network_error'} as AuthError}}
 }
 async function sync(){const before=session?.user.id;const result=await call<{session:BrowserSession|null}>('session');if(!result.error){if(before&&!session)emit('SIGNED_OUT');else if(before!==session?.user.id)emit('SIGNED_IN')}return result}
 function initialize(){
  if(!initialized)initialized=(async()=>{
   // Superseded browser tokens must never be reused or forwarded to the BFF.
   try{for(const key of ['kumeel-auth-v2','kumeel-auth-v2-code-verifier','sb-jigypvbqiuakdatkzoul-auth-token']){sessionStorage.removeItem(key);localStorage.removeItem(key)}}catch{/* Storage is optional. */}
   const url=new URL(location.href),code=url.searchParams.get('code')
   if(code){const result=await call<{session:BrowserSession|null}>('exchange',{code});url.searchParams.delete('code');if(result.error){url.searchParams.set('auth_error','expired');location.replace(url.pathname+url.search);return}history.replaceState(null,'',url.pathname+url.search)}
   else if(new URLSearchParams(url.hash.slice(1)).has('access_token')){url.hash='';url.searchParams.set('auth_error','expired');location.replace(url.pathname+url.search);return}
   await call('session')
  })()
  return initialized
 }
 refreshBrowserSession=async()=>{const result=await sync();return !result.error&&Boolean(session)}
 if(channel)channel.onmessage=()=>{void sync()}
 if(typeof window!=='undefined'){
  window.addEventListener('focus',()=>{void initialize().then(sync)})
  // Refresh happens on the server before expiry; browser receives only the verified user.
  window.setInterval(()=>{if(document.visibilityState==='visible')void initialize().then(sync)},60_000)
 }
 return {
  onAuthStateChange(callback:Listener){listeners.add(callback);if(typeof window!=='undefined')void initialize().then(()=>{if(listeners.has(callback))callback('INITIAL_SESSION',session)});return {data:{subscription:{unsubscribe(){listeners.delete(callback)}}}}},
  async getSession(){await initialize();const result=await sync();return {data:{session},error:result.error}},
  async getUser(){await initialize();const result=await sync();return {data:{user:session?.user??null},error:result.error}},
  signInWithPassword:(args:unknown)=>call<{session:BrowserSession|null}>('signInWithPassword',args),
  signUp:(args:unknown)=>call<{session:BrowserSession|null}>('signUp',args),
  signInWithOtp:(args:unknown)=>call('signInWithOtp',args),
  resetPasswordForEmail:(email:string,options:unknown)=>call('resetPasswordForEmail',{email,options}),
  signOut:(args?:{scope?:'global'|'local'})=>call('signOut',args),
  updateUser:(args:{password:string})=>call('updateUser',args),
  mfa:{
   listFactors:()=>call<{all:Factor[];totp:Factor[];phone:Factor[]}>('listFactors'),
   enroll:(args:unknown)=>call<{id:string;totp:{qr_code:string;secret:string;uri:string}}>('enroll',args),
   unenroll:(args:{factorId:string})=>call('unenroll',args),
   challengeAndVerify:(args:{factorId:string;code:string})=>call('challengeAndVerify',args),
   getAuthenticatorAssuranceLevel:()=>call<{currentLevel:'aal1'|'aal2'|null;nextLevel:'aal1'|'aal2'|null}>('assurance'),
  },
 }
}
export async function backendFetch(input:RequestInfo|URL,init?:RequestInit){
 const request=new Request(input,init),url=new URL(request.url)
 const headers=new Headers(request.headers);headers.delete('Authorization');headers.delete('apikey');headers.set('X-Kumeel-BFF','1')
 const body=['GET','HEAD'].includes(request.method)?undefined:await request.blob()
 const send=()=>fetch(`/api/backend?path=${encodeURIComponent(url.pathname+url.search)}`,{method:request.method,headers,body,credentials:'same-origin',signal:request.signal})
 const response=await send()
 if(response.status===401&&await refreshBrowserSession())return send()
 return response
}
