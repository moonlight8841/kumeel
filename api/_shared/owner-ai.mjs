// Shared by owner-only AI endpoints. The leading underscore keeps Vercel from
// deploying this file as its own function.
import {readFile} from 'node:fs/promises'
import {GoogleGenerativeAIAbortError,GoogleGenerativeAIResponseError} from '@google/generative-ai'

export const supabaseConfig=JSON.parse(await readFile(new URL('../../src/supabase-config.json',import.meta.url),'utf8'))
export const authConfig=JSON.parse(await readFile(new URL('../../src/auth-config.json',import.meta.url),'utf8'))
export const OWNER_EMAIL='komeil9060@gmail.com'

export function jsonResponder(res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff')
 return (status,error)=>res.status(status).json({success:false,error})
}

// Owner = confirmed owner email + (optional) MFA level + row in kumeel_editors.
// Returns {user} on success or {status,error} to send back.
export async function verifyOwner({authorization,fetcher=fetch,config=supabaseConfig,auth=authConfig,forbidden='متاح للمالك فقط.'}){
 if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,6000}$/.test(authorization))return {status:401,error:'سجّل الدخول بحساب الإدارة.'}
 const userResponse=await fetcher(`${config.url}/auth/v1/user`,{headers:{apikey:config.publishableKey,Authorization:authorization},signal:AbortSignal.timeout(8000)})
 if(!userResponse.ok)return {status:401,error:'انتهت جلسة الدخول. سجّل الدخول مجددًا.'}
 const user=await userResponse.json()
 if(!user.email_confirmed_at||user.email?.toLowerCase()!==OWNER_EMAIL||typeof user.id!=='string')return {status:403,error:forbidden}
 if(auth.requireAdminMfa){const payload=JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url').toString());if(payload.aal!=='aal2')return {status:403,error:'أكمل التحقق الثنائي.'}}
 const memberResponse=await fetcher(`${config.url}/rest/v1/kumeel_editors?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`,{headers:{apikey:config.publishableKey,Authorization:authorization},signal:AbortSignal.timeout(8000)})
 if(!memberResponse.ok)return {status:503,error:'تعذّر التحقق من صلاحيات الإدارة.'}
 const members=await memberResponse.json()
 if(!Array.isArray(members)||!members.some(m=>m.user_id===user.id))return {status:403,error:'لا توجد صلاحية إدارة.'}
 return {user}
}

// Maps provider failures to safe Arabic messages; logs only the error class.
export function providerFailure(error,label){
 console.error(label,{type:error instanceof GoogleGenerativeAIAbortError?'ProviderTimeout':error instanceof GoogleGenerativeAIResponseError?'ProviderResponse':error instanceof SyntaxError?'InvalidJson':'ProviderError',status:Number.isInteger(error?.status)?error.status:undefined})
 if(error instanceof GoogleGenerativeAIAbortError||['AbortError','TimeoutError'].includes(error?.name))return {status:504,error:'استغرق Gemini وقتًا أطول من المهلة. أعد المحاولة بنص أقصر.'}
 if(error?.status===429)return {status:429,error:'بلغت خدمة Gemini حد الاستخدام المتاح. جرّب لاحقًا؛ لم نفعّل أي ترقية مدفوعة.'}
 if([400,401,403].includes(error?.status))return {status:503,error:'رفض Gemini الطلب. تحقّق من صلاحية المفتاح وإعداداته في Vercel.'}
 if(error?.status===404)return {status:503,error:'نموذج Gemini المحدد غير متاح. راجع GEMINI_MODEL على الخادم.'}
 if([500,503].includes(error?.status))return {status:503,error:'خدمة Gemini مزدحمة الآن. أعد المحاولة بعد دقيقة.'}
 if(error instanceof SyntaxError)return {status:502,error:'عادت نتيجة غير مكتملة. جرّب نصًا أقصر.'}
 return {status:502,error:'تعذّر التوليد أو الاتصال. أعد المحاولة لاحقًا.'}
}

// ---------- Structured output ----------
// gemini-3.5-flash returns 503 when systemInstruction is combined with
// responseSchema (reproduced repeatedly; each feature alone succeeds). We ask for
// JSON mode, describe the shape in the instructions, and rely on the strict
// server-side validation every endpoint already performs on the result.
function describe(schema,depth=0){
 if(schema.type==='OBJECT'||schema.type==='object')return `{${Object.entries(schema.properties).map(([k,v])=>`"${k}"${(schema.required??[]).includes(k)?'':'?'}: ${describe(v,depth+1)}`).join(', ')}}`
 if(schema.type==='ARRAY'||schema.type==='array')return `[${describe(schema.items,depth+1)}, …]`
 return String(schema.type).toLowerCase()==='integer'?'integer':'string'
}
// Tolerates ```json fences some models add despite JSON mode.
export function parseModelJson(text){return JSON.parse(String(text).trim().replace(/^```(?:json)?s*/i,'').replace(/s*```$/,''))}
export function jsonInstruction(system,schema){return `${system}\n\nأعد كائن JSON واحدًا فقط بهذا الشكل بالضبط، دون أي نص قبله أو بعده: ${describe(schema)}`}

// Gemini 3 models think before answering; at the default level a short chat reply
// took >20s, at 'low' about 3s. Older models reject the field, so scope it.
export function thinkingFor(model){return /^gemini-3/.test(model)?{thinkingConfig:{thinkingLevel:'low'}}:{}}

// ---------- Model fallback ----------
// Gemini models return 503 ("overloaded") in bursts, sometimes for every model of a
// family at once. Strategy: try GEMINI_MODEL, then GEMINI_FALLBACK_MODELS; give each
// model one quick retry on 503 (bursts often clear in seconds); include lite models,
// which run on separate capacity; skip models that just failed; never exceed a time
// budget below the function's maxDuration.
export const DEFAULT_FALLBACK_MODELS='gemini-3.5-flash,gemini-3.5-flash-lite,gemini-flash-latest,gemini-flash-lite-latest'
const SKIP_MS=60_000
const RETRY_DELAY_MS=1500
const unhealthy=new Map()
// Overload, outage, unknown model or a hung request: try the next model.
const retriable=error=>[404,500,502,503,504].includes(error?.status)||error instanceof GoogleGenerativeAIAbortError||['AbortError','TimeoutError'].includes(error?.name)

export function modelChain(env,now=Date.now(),health=unhealthy){
 const list=[...new Set([env.GEMINI_MODEL||'gemini-flash-latest',...String(env.GEMINI_FALLBACK_MODELS??DEFAULT_FALLBACK_MODELS).split(',')].map(m=>m.trim()).filter(m=>/^[a-z0-9.-]{3,60}$/.test(m)))]
 const healthy=list.filter(m=>!(health.get(m)>now))
 return [...healthy,...list.filter(m=>!healthy.includes(m))]
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
export async function withModelFallback(env,attempt,{now=Date.now,health=unhealthy,budgetMs=45_000,sleep=wait}={}){
 const started=now()
 let last
 for(const model of modelChain(env,now(),health)){
  for(let tryNo=1;tryNo<=2;tryNo++){
   if(now()-started>budgetMs)throw last??Object.assign(new Error('budget'),{status:503})
   try{const result=await attempt(model);health.delete(model);return result}
   catch(error){
    last=error
    if(!retriable(error))throw error
    console.warn('model_fallback',{model,try:tryNo,status:Number.isInteger(error?.status)?error.status:error?.name})
    if(error?.status===503&&tryNo===1){await sleep(RETRY_DELAY_MS);continue}
    health.set(model,now()+SKIP_MS);break
   }
  }
 }
 throw last
}

export function parseBody(req){try{return typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return undefined}}
