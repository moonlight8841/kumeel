import {supabase} from './cloud'
import {communityError} from './community'
export type PublicResponse={id:string;author_name:string;body:string;published_at:string}
export type OwnResponse={id:string;writing_id:string;author_name:string;body:string;status:string;revision:number;created_at:string}
export function responseError(error:unknown){
 const e=error as {code?:string;message?:string}
 if(['PGRST205','PGRST202','42P01','42883'].includes(e?.code??''))return 'الآراء غير متاحة حاليًا.'
 const m=e?.message??''
 if(m.includes('COMMUNITY_NOT_PUBLISHED'))return 'هذه الكتابة لا تستقبل آراء الآن.'
 if(m.includes('COMMUNITY_CONTENT')||e?.code==='23514')return 'الاسم من ٢ إلى ٦٠ حرفًا، والرأي من ١٠ إلى ٢٠٠٠ حرف.'
 if(m.includes('COMMUNITY_LIMIT'))return 'وصلت إلى الحد اليومي للردود والآراء. حاول غدًا.'
 return communityError(error)
}
export async function listResponses(writingId:string){
 const {data,error}=await supabase.from('kumeel_public_writing_responses').select('id,author_name,body,published_at').eq('writing_id',writingId).order('published_at').limit(100)
 if(error)throw error;return data as PublicResponse[]
}
export async function listMyResponses(writingId:string,userId:string){
 const {data,error}=await supabase.from('kumeel_writing_responses').select('id,writing_id,author_name,body,status,revision,created_at').eq('writing_id',writingId).eq('author_id',userId).neq('status','published').order('created_at',{ascending:false}).limit(20)
 if(error)throw error;return data as OwnResponse[]
}
export async function sendResponse(writingId:string,name:string,body:string){
 const {error}=await supabase.rpc('kumeel_send_writing_response',{p_writing:writingId,p_name:name,p_body:body});if(error)throw error
}
export async function listResponseQueue(status:'pending'|'published'){
 const {data,error}=await supabase.from('kumeel_writing_responses').select('id,writing_id,author_name,body,status,revision,created_at').eq('status',status).order('created_at').limit(50)
 if(error)throw error;return data as OwnResponse[]
}
export async function reviewResponse(id:string,revision:number,decision:'published'|'rejected',note:string){
 const {error}=await supabase.rpc('kumeel_review_writing_response',{p_id:id,p_revision:revision,p_decision:decision,p_note:note});if(error)throw error
}
