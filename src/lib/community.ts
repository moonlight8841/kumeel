import {supabase} from './cloud'
export const categories=['فلسفة','علم','ثقافة','تأملات'] as const
export type Submission={id:string;author_name:string;title:string;body:string;category:string;sources:string;assisted:boolean;rights_confirmed:boolean;status:string;revision:number;review_note:string;updated_at:string}
export type CommunityPost=Pick<Submission,'id'|'author_name'|'title'|'body'|'category'|'sources'|'assisted'>&{published_at:string}
export type CommunityComment={id:string;post_id:string;author_name:string;body:string;status:string;revision:number;created_at:string}
export const statusLabel:Record<string,string>={draft:'مسودة خاصة',pending:'بانتظار المراجعة',published:'منشور',changes_requested:'يحتاج تعديلًا',rejected:'لم يُعتمد'}
export function communityError(error:unknown){
 const e=error as {code?:string;message?:string}
 if(['PGRST205','PGRST202','42P01','42883'].includes(e?.code??''))return 'مساحة المجتمع قيد التهيئة. لم تُحفظ بياناتك؛ احتفظ بالنص وحاول بعد تفعيل قاعدة البيانات.'
 const m=e?.message??''
 if(m.includes('COMMUNITY_CONFLICT'))return 'تغيّرت هذه المساهمة في جلسة أخرى. احتفظ بالنص ثم حدّث القائمة قبل المتابعة.'
 if(m.includes('COMMUNITY_LIMIT'))return 'وصلت إلى الحد اليومي للمساهمات أو المحاولات. حاول غدًا.'
 if(m.includes('COMMUNITY_LOCKED'))return 'هذه النسخة قيد المراجعة أو منشورة؛ لا يمكن تعديلها الآن.'
 if(m.includes('COMMUNITY_NOTE_REQUIRED'))return 'اكتب سبب القرار قبل إعادته أو رفضه.'
 if(m.includes('COMMUNITY_NOT_PUBLISHED'))return 'المساهمة ليست منشورة الآن؛ حدّث الصفحة.'
 if(e?.code==='42501'||m.includes('COMMUNITY_AUTH'))return 'تحقق من تسجيل الدخول وتأكيد البريد وصلاحية الحساب.'
 if(m.includes('COMMUNITY_CONTENT')||e?.code==='23514')return 'راجع حدود الحقول وحقوق النص؛ الإرسال يحتاج نصًا من ٨٠ حرفًا على الأقل.'
 return 'تعذّر تنفيذ العملية. لم نؤكد الحفظ؛ احتفظ بالنص ثم أعد المحاولة.'
}
export async function listPosts(offset=0,category=''){
 let query=supabase.from('kumeel_community_posts').select('id,author_name,title,body,category,sources,assisted,published_at').order('published_at',{ascending:false}).order('id').range(offset,offset+19)
 if(category)query=query.eq('category',category)
 const {data,error}=await query;if(error)throw error;return data as CommunityPost[]
}
export async function saveSubmission(item:Partial<Submission>,submit:boolean){
 const {data,error}=await supabase.rpc('kumeel_save_submission',{p_id:item.id??null,p_revision:item.revision??null,p_name:item.author_name,p_title:item.title,p_body:item.body,p_category:item.category,p_sources:item.sources??'',p_assisted:item.assisted??false,p_submit:submit,p_rights:item.rights_confirmed??false})
 if(error)throw error;const result=Array.isArray(data)?data[0]:data
 if(!result?.id||!Number.isInteger(result.revision))throw new Error('Invalid save response')
 return result as Submission
}
export async function review(kind:'post'|'comment',id:string,revision:number,decision:string,note:string){
 const {error}=await supabase.rpc('kumeel_review_community',{p_kind:kind,p_id:id,p_revision:revision,p_decision:decision,p_note:note});if(error)throw error
}
