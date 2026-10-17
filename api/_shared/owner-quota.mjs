import config from '../../src/supabase-config.json' with {type:'json'}
export async function takeOwnerQuota({actor,scope,env,fetcher=fetch}){
 if(typeof env.CHAT_RATE_SECRET!=='string'||env.CHAT_RATE_SECRET.length<32)return null
 try{
  const response=await fetcher(`${config.url}/rest/v1/rpc/kumeel_owner_ai_take`,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_secret:env.CHAT_RATE_SECRET,p_actor:actor,p_scope:scope}),signal:AbortSignal.timeout(6000)})
  if(!response.ok)return null
  const value=await response.json()
  if(typeof value?.allowed!=='boolean'||!Number.isInteger(value.retry_after)||value.retry_after<0||value.retry_after>86400||(!value.allowed&&!['daily','cooldown'].includes(value.reason)))return null
  return value
 }catch{return null}
}
export async function enforceOwnerQuota({actor,scope,env,fetcher,quota=takeOwnerQuota,res,fail}){
 const state=await quota({actor,scope,env,fetcher})
 if(!state){fail(503,'تعذّر التحقق من حدود الاستخدام. لم يُرسل الطلب إلى خدمة الذكاء الاصطناعي.');return false}
 if(!state.allowed){res.setHeader('Retry-After',String(Math.max(1,state.retry_after)));fail(429,state.reason==='daily'?'بلغت حد استخدام هذه الأداة لهذا اليوم. حاول لاحقًا.':'طلبات متقاربة. انتظر المدة المحددة ثم أعد المحاولة.');return false}
 return true
}
