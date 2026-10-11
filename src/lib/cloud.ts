import { createClient } from '@supabase/supabase-js'
import config from '../supabase-config.json'
import { validContent, type Content } from '../content'

export const supabase = createClient(config.url, config.publishableKey, {
  auth: { persistSession: typeof window !== 'undefined', autoRefreshToken: typeof window !== 'undefined', detectSessionInUrl: typeof window !== 'undefined' },
})
export async function readPublished() {
  const { data, error } = await supabase.from('kumeel_published').select('content,revision').eq('id', 'main').single()
  if (error) throw error
  if (!validContent(data.content)) throw new Error('المحتوى المنشور غير صالح.')
  return { content: data.content, revision: data.revision as number }
}
export async function isEditor(id: string) {
  const { data, error } = await supabase.from('kumeel_editors').select('user_id').eq('user_id', id).maybeSingle()
  if (error) throw error
  return Boolean(data)
}
export async function saveCloudDraft(id: string, content: Content) {
  const { error } = await supabase.from('kumeel_drafts').upsert({ user_id: id, content })
  if (error) throw error
}
export async function loadCloudDraft(id: string) {
  const { data, error } = await supabase.from('kumeel_drafts').select('content').eq('user_id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('لا توجد مسودة سحابية محفوظة بعد.')
  if (!validContent(data.content)) throw new Error('المسودة غير صالحة.')
  return data.content
}
export async function publishContent(content: Content, revision: number) {
  if (!validContent(content)) throw new Error('المحتوى غير صالح.')
  const media = await Promise.all(content.media.map(async item => {
    if (!item.url.startsWith('data:')) return item
    const blob = await (await fetch(item.url)).blob()
    const extension = blob.type.split('/')[1]
    const path = `${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('kumeel-media').upload(path, blob, { contentType: blob.type, upsert: false })
    if (error) throw error
    return { ...item, url: supabase.storage.from('kumeel-media').getPublicUrl(path).data.publicUrl }
  }))
  const next = { ...content, media }
  const { data, error } = await supabase.from('kumeel_published').update({ content: next }).eq('id', 'main').eq('revision', revision).select('revision').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('تغيّرت النسخة المنشورة من جلسة أخرى. احفظ مسودتك ثم أعد تحميل الصفحة قبل النشر.')
  return { content: next, revision: data.revision as number }
}
export async function uploadMedia(file: File) {
  const allowed: Record<string,string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }
  if (!allowed[file.type] || file.size > 50 * 1024 * 1024) throw new Error('اختر صورة أو فيديو MP4/WebM حتى ٥٠ ميغابايت.')
  const path = `${crypto.randomUUID()}.${allowed[file.type]}`
  const { error } = await supabase.storage.from('kumeel-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('kumeel-media').getPublicUrl(path).data.publicUrl
}
