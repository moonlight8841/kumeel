import {clearPrivateTabData,PRIVATE_DATA_CLEARED} from './privacy'
import { createClient } from '@supabase/supabase-js'
import config from '../supabase-config.json'
import { validContent } from '../content'
import {createBrowserAuth,backendFetch} from './browser-auth'
import {adoptApprovedWritings} from './publication'
import {validOwnerDraft,publicPayload,type OwnerDraft} from './translations'
import {resolvePublishedTranslations} from './localized-content'

if (typeof window !== 'undefined') {
  try { localStorage.removeItem('sb-jigypvbqiuakdatkzoul-auth-token') } catch { /* Old persistent sessions are no longer used. */ }
}

const database=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:typeof window!=='undefined'?backendFetch:fetch}})
export const supabase={from:database.from.bind(database),rpc:database.rpc.bind(database),storage:database.storage,auth:createBrowserAuth()}
if(typeof window!=='undefined')supabase.auth.onAuthStateChange(event=>{
 if(event!=='SIGNED_OUT')return
 try{clearPrivateTabData()}catch{/* Session revocation remains effective if browser storage is unavailable. */}
 window.dispatchEvent(new Event(PRIVATE_DATA_CLEARED))
})
export async function readPublished() {
  const { data, error } = await supabase.from('kumeel_published').select('content,revision').eq('id', 'main').single()
  if (error) throw error
  if (!validContent(data.content)) throw new Error('المحتوى المنشور غير صالح.')
  return { content: await resolvePublishedTranslations(adoptApprovedWritings(data.content)), revision: data.revision as number }
}
export async function isEditor(id:string){
 const {data:user,error:identityError}=await supabase.auth.getUser()
 if(identityError||user.user?.id!==id)return false
 const {data,error}=await supabase.rpc('kumeel_is_secure_editor')
 if(error)throw error
 return data===true
}
export async function saveCloudDraft(id: string, content: OwnerDraft) {
  if(!validOwnerDraft(content))throw new Error('المسودة الخاصة غير صالحة.')
  const { error } = await supabase.from('kumeel_drafts').upsert({ user_id: id, content })
  if (error) throw error
}
export async function loadCloudDraft(id: string) {
  const { data, error } = await supabase.from('kumeel_drafts').select('content').eq('user_id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('لا توجد مسودة سحابية محفوظة بعد.')
  if (!validOwnerDraft(data.content)) throw new Error('المسودة غير صالحة.')
  return data.content
}
export async function publishContent(content: OwnerDraft, revision: number) {
  const approved=await publicPayload(content)
  const media = await Promise.all(approved.media.map(async item => {
    if (!item.url.startsWith('data:')) return item
    const blob = await (await fetch(item.url)).blob()
    const extension = blob.type.split('/')[1]
    const path = `${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('kumeel-media').upload(path, blob, { contentType: blob.type, upsert: false })
    if (error) throw error
    return { ...item, url: supabase.storage.from('kumeel-media').getPublicUrl(path).data.publicUrl }
  }))
  const next = { ...approved, media }
  const { data, error } = await supabase.from('kumeel_published').update({ content: next }).eq('id', 'main').eq('revision', revision).select('revision').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('تغيّرت النسخة المنشورة من جلسة أخرى. احفظ مسودتك ثم أعد تحميل الصفحة قبل النشر.')
  return { content: {...next,...(content.translationDrafts?{translationDrafts:content.translationDrafts}:{})}, revision: data.revision as number }
}
export async function uploadMedia(file: File) {
  const allowed: Record<string,string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }
  if (!allowed[file.type] || file.size > 50 * 1024 * 1024) throw new Error('اختر صورة أو فيديو MP4/WebM حتى ٥٠ ميغابايت.')
  const path = `${crypto.randomUUID()}.${allowed[file.type]}`
  const { error } = await supabase.storage.from('kumeel-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('kumeel-media').getPublicUrl(path).data.publicUrl
}
