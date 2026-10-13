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
 if(error instanceof SyntaxError)return {status:502,error:'عادت نتيجة غير مكتملة. جرّب نصًا أقصر.'}
 return {status:502,error:'تعذّر التوليد أو الاتصال. أعد المحاولة لاحقًا.'}
}

export function parseBody(req){try{return typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return undefined}}
