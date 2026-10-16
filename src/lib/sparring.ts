import {supabase} from './cloud'
import {ASSIST_MAX_BODY,requestAssist} from './ai-assist'
import {communityError} from './community'
import {isStarterWriting} from './publication'
import {MAX_ROUNDS,validExchange,type ExchangeRound,type SparringStyle} from './exchange'
import type {Content,Writing} from '../content'

export type Turn={role:'critic'|'owner';text:string;quote?:string}
export type SparringSession={id:string;writing_id:string;style:SparringStyle;turns:Turn[];revision:number;updated_at:string}
export const MAX_TURNS=40
const columns='id,writing_id,style,turns,revision,updated_at'

export function sparringError(error:unknown){
 if(error&&typeof error==='object'&&'code' in error)return communityError(error)
 if(error instanceof Error&&!/COMMUNITY_/.test(error.message))return error.message
 return communityError(error)
}
export async function listSessions(){
 const sessions:SparringSession[]=[]
 for(let from=0;;from+=200){
  const {data,error}=await supabase.from('kumeel_sparring').select(columns).order('updated_at',{ascending:false}).order('id').range(from,from+199)
  if(error)throw error
  sessions.push(...data as SparringSession[])
  if(data.length<200)return sessions
 }
}
export async function saveSession(s:{id?:string;revision?:number;writing_id:string;style:SparringStyle;turns:Turn[]}){
 const {data,error}=await supabase.rpc('kumeel_save_sparring',{p_id:s.id??null,p_revision:s.revision??null,p_writing:s.writing_id,p_style:s.style,p_turns:s.turns})
 if(error)throw error;const result=Array.isArray(data)?data[0]:data
 if(!result?.id||!Number.isInteger(result.revision))throw new Error('تعذّر تأكيد حفظ الجلسة.')
 return result as SparringSession
}
export async function deleteSession(id:string){const {error}=await supabase.rpc('kumeel_delete_sparring',{p_id:id});if(error)throw error}

// Newest turns that fit the assistant's body limit; quotes stay local.
export function objectionPayload(writing:Pick<Writing,'title'|'text'>,style:SparringStyle,turns:Turn[]){
 let recent=turns.slice(-6).map(({role,text})=>({role,text}))
 const size=(t:typeof recent)=>new TextEncoder().encode(JSON.stringify({task:'objection',payload:{title:writing.title,text:writing.text,style,turns:t}})).byteLength
 while(recent.length&&size(recent)>ASSIST_MAX_BODY)recent=recent.slice(1)
 return {title:writing.title,text:writing.text,style,turns:recent}
}
export async function nextObjection(writing:Pick<Writing,'title'|'text'>,style:SparringStyle,turns:Turn[]):Promise<Turn>{
 const result=await requestAssist('objection',objectionPayload(writing,style,turns))
 return result.quote?{role:'critic',text:result.objection,quote:result.quote}:{role:'critic',text:result.objection}
}
// Copies one round into the draft; the public site changes only after the owner publishes.
export function publishRound<T extends Content>(content:T,writingId:string,round:Omit<ExchangeRound,'publishedAt'>,now=new Date()):T{
 const writing=content.writings.find(w=>w.id===writingId)
 if(!writing)throw new Error('لم تعد هذه الكتابة في المسودة.')
 const rounds=writing.exchange??[]
 if(rounds.length>=MAX_ROUNDS)throw new Error(`بلغت هذه الكتابة ${MAX_ROUNDS.toLocaleString('ar-SA')} جولات منشورة.`)
 const next:ExchangeRound={style:round.style,objection:round.objection,reply:round.reply.trim(),publishedAt:now.toISOString()}
 if(!validExchange([next]))throw new Error('الجولة غير صالحة؛ راجع طول الاعتراض والجواب.')
 if(rounds.some(r=>r.style===next.style&&r.objection===next.objection&&r.reply.trim()===next.reply))throw new Error('أُضيفت هذه الجولة إلى المسودة بالفعل.')
 return {...content,writings:content.writings.map(w=>w.id===writingId?{...w,exchange:[...rounds,next]}:w)}
}
export function untestedWritings(content:Content,sessions:Pick<SparringSession,'writing_id'>[]){
 const tested=new Set(sessions.map(s=>s.writing_id))
 return content.writings.filter(w=>!isStarterWriting(w)&&!tested.has(w.id))
}
