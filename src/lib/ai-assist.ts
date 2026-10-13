import {supabase} from './cloud'
import type {QuizQuestion} from '../learning'

export type AssistRequests={
 proofread:{payload:{text:string};result:{corrected:string;notes:string[]}}
 alt:{payload:{imageUrl:string;title?:string;context?:string};result:{alt:string}}
 sessionSummary:{payload:{notes:string;title?:string;question?:string};result:{summary:string}}
 quiz:{payload:{text:string;title?:string;count?:number};result:{questions:QuizQuestion[]}}
}
export type AssistTask=keyof AssistRequests

export const ASSIST_MAX_TEXT=12000
const mediaPrefix='/storage/v1/object/public/kumeel-media/'
// Mirrors the server rule: only uploaded platform images can be described.
export function describableImage(url:string){try{return new URL(url).pathname.startsWith(mediaPrefix)}catch{return false}}

export async function requestAssist<T extends AssistTask>(task:T,payload:AssistRequests[T]['payload']):Promise<AssistRequests[T]['result']>{
 const {data:{session}}=await supabase.auth.getSession()
 if(!session)throw new Error('سجّل الدخول بحساب الإدارة لاستخدام المساعد.')
 let response:Response
 try{response=await fetch('/api/edit-assist',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({task,payload})})}
 catch{throw new Error('تعذّر الاتصال بالخادم. تحقق من الشبكة.')}
 const body:unknown=await response.json().catch(()=>null)
 const ok=body&&typeof body==='object'&&(body as {success?:unknown}).success===true
 if(!response.ok||!ok)throw new Error(body&&typeof body==='object'&&typeof (body as {error?:unknown}).error==='string'?(body as {error:string}).error:'تعذّر تنفيذ الطلب.')
 return (body as {data:AssistRequests[T]['result']}).data
}

// Paragraph-level diff so the owner sees exactly which paragraphs changed.
export type ParagraphChange={before:string;after:string;changed:boolean}
export function paragraphDiff(before:string,after:string):ParagraphChange[]{
 const a=before.split(/\n{2,}/),b=after.split(/\n{2,}/)
 const length=Math.max(a.length,b.length)
 return Array.from({length},(_,i)=>({before:a[i]??'',after:b[i]??'',changed:(a[i]??'').trim()!==(b[i]??'').trim()}))
}
