import { defaultSite, validSite, type SiteSettings } from './site'
import type { Discovery, QuizQuestion } from './learning'
import {defaultBooks,validBooks,type Book} from './books'
import {approvedWritings} from './approved-writings'
import {validTranslationCatalogue,type TranslationCatalogue} from './lib/translation-records'
export const heroImage = '/images/desert.png'
export type Writing = { id: string; title: string; category: 'تأملات' | 'شعر' | 'فلسفة' | 'علوم' | 'ثقافة'; text: string; format?:'plain'|'markdown'; publishedAt?:string }
export type Media = { id: string; title: string; type: 'صورة' | 'فيديو'; url: string; purpose?: 'حكمة بصرية' | 'درس مرئي'; description?: string; source?: string; thumbnail?: string; uploadedAt?: string }
export type Idea = { id: string; title: string; kind: 'حكمة' | 'درس' | 'تجربة فكرية'; text: string; question: string; counterpoint?: string; source?: string; sourceUrl?: string; sample?: boolean }
export type Session = { id: string; title: string; question: string; startsAt: string; durationMinutes: number; joinUrl: string; notes?: string; cancelled?: boolean; registrationUrl?:string; recordingUrl?:string; summary?:string; summaryPdfUrl?:string; prepare?: string; relatedIds?: string[] }
export type Content = { bio: string; writings: Writing[]; media: Media[]; ideas?: Idea[]; sessions?: Session[]; site?: SiteSettings; discoveries?: Discovery[]; quiz?: QuizQuestion[]; books?:Book[]; translations?:TranslationCatalogue }
export const legacyContent: Content = {
  books: defaultBooks,
  site: defaultSite,
  bio: 'أنا كميل ال نهاب. أريد لهذه المساحة أن تكون نافذة للفلسفة والعلم والثقافة؛ أشارك فيها الأفكار التي تستحق التأمل، وأفتح أسئلة للتعلّم والحوار. المعرفة هنا دعوة إلى الفهم، وإلى مراجعة ما نظنه بديهيًا.',
  writings: [
    { id: 'meaning', title: 'عن الأشياء التي تبقى', category: 'تأملات', text: 'ربما لا تُقاس الحياة بعدد الأيام التي مرّت، بل بعدد المرات التي كنّا فيها حاضرين حقًا.\n\nفي حديثٍ لم نستعجل نهايته، في طريقٍ مشيناه دون أن ننظر إلى الساعة، وفي يدٍ امتدت حين ضاقت الكلمات.\n\nلا يبقى من الطريق غباره، بل ما تغيّر فينا ونحن نعبره. وما نمنحه للحياة من انتباه، تعيده إلينا على هيئة معنى.' },
    { id: 'light', title: 'للضوء نافذة أخرى', category: 'شعر', text: 'أتركُ للضوءِ بابًا مواربًا\nلعلّ صباحًا يمرّ\nوأجمعُ من صمتِ هذا الطريق\nكلامًا يليقُ بما لا يُقال\n\nفما كلُّ من سارَ يعرفُ دربًا\nولكنّ في السيرِ بعضَ الوصول.' },
    { id: 'slow', title: 'أن تمضي على مهل', category: 'تأملات', text: 'هناك جمال لا يكشف نفسه للمستعجل. ظل شجرة يتبدّل، ورائحة كتاب قديم، ووجه مألوف نراه كأننا نراه للمرة الأولى.\n\nأن تمضي على مهل، هو أن تمنح الأشياء فرصة لتصل إليك. ليس كل توقف تأخرًا؛ بعض الوقوف عودة إلى النفس.' },
  ],
  media: [],
  ideas: [
    { id: 'certainty', kind: 'حكمة', title: 'ماذا لو كان يقينك سؤالًا مؤجلًا؟', text: 'الفكرة التي لا نسمح بمساءلتها قد تصبح حاجزًا أمام الفهم. جرّب أن تكتب ما تعتقده، ثم الدليل الذي قد يجعلك تغيّر رأيك.', question: 'ما القناعة التي تستطيع مراجعتها دون أن تفقد احترامك لنفسك؟', counterpoint: 'ليست كل قناعة هشّة. بعض المواقف تستند إلى أدلة قوية؛ المراجعة لا تعني مساواة كل الآراء.', sample: true },
    { id: 'opposite', kind: 'تجربة فكرية', title: 'دافع عن الفكرة التي تخالفها', text: 'اختر خلافًا بسيطًا. اكتب أقوى حجة للطرف الآخر، كما لو كنت تريد أن يفهمها قارئ منصف. ثم ارجع إلى موقفك: هل تغيّر اعتراضك؟', question: 'هل اختلفت مع الفكرة نفسها، أم مع أضعف نسخة منها؟', counterpoint: 'فهم موقف لا يلزمك بقبوله. الهدف اختبار عدالة الاعتراض، لا التخلّي عن حكمك.', sample: true },
    { id: 'claim', kind: 'درس', title: 'من العبارة الجذابة إلى السؤال الدقيق', text: 'عند قراءة ادعاء مثير، افصل بين العبارة ودليلها. اسأل: ماذا تعني الكلمات؟ ما الذي تم قياسه؟ وهل توجد تفسيرات أخرى؟\n\nاكتب الادعاء في جملة يمكن اختبارها. إذا تعذّر ذلك، فقد تكون أمام رأي أو استعارة تحتاج إلى نقاش، لا نتيجة تجريبية.', question: 'ما المعلومة التي تحتاجها قبل مشاركة هذا الادعاء؟', sample: true },
  ],
  sessions: [],
}
export const initialContent:Content={...legacyContent,writings:approvedWritings}
export function httpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000 || [...value].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}
export function youtubeEmbed(value: string): string | null {
  try {
    const url = new URL(value)
    if (!httpsUrl(value) || url.port) return null
    let id: string | null = null
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1)
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(embed|live|shorts)\//.test(url.pathname) ? url.pathname.split('/')[2] : null
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  } catch { return null }
}
export function meetingUrl(value: unknown): value is string {
  if (!httpsUrl(value)) return false
  const url = new URL(value)
  return !url.port && ((url.hostname === 'meet.google.com' && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(url.pathname)) || Boolean(youtubeEmbed(value)))
}
export function validContent(value: unknown): value is Content {
  if (!value || typeof value !== 'object') return false
  if(Object.prototype.hasOwnProperty.call(value,'translationDrafts'))return false
  const c = value as Content
  if(c.translations!==undefined&&!validTranslationCatalogue(c.translations))return false
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
  const ids = (items: { id: string }[]) => new Set(items.map(i => i.id)).size === items.length
  const optional = (v: unknown, max: number) => v === undefined || text(v, max)
  const required = (v: unknown, max: number) => text(v, max) && typeof v === 'string' && Boolean(v.trim())
  const ideasValid = c.ideas === undefined || (Array.isArray(c.ideas) && c.ideas.length <= 500 && c.ideas.every(i => i && required(i.id, 150) && required(i.title, 150) && ['حكمة', 'درس', 'تجربة فكرية'].includes(i.kind) && required(i.text, 50000) && required(i.question, 1000) && optional(i.counterpoint, 10000) && optional(i.source, 1000) && (i.sourceUrl === undefined || httpsUrl(i.sourceUrl)) && (i.sample === undefined || typeof i.sample === 'boolean')) && ids(c.ideas))
  const sessionsValid = c.sessions === undefined || (Array.isArray(c.sessions) && c.sessions.length <= 100 && c.sessions.every(s => s && required(s.id, 150) && required(s.title, 150) && required(s.question, 1000) && typeof s.startsAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s.startsAt) && Number.isFinite(Date.parse(s.startsAt)) && Number.isInteger(s.durationMinutes) && s.durationMinutes >= 5 && s.durationMinutes <= 180 && meetingUrl(s.joinUrl) && optional(s.notes, 10000) && optional(s.summary,10000) && (s.registrationUrl===undefined||httpsUrl(s.registrationUrl)) && (s.recordingUrl===undefined||Boolean(youtubeEmbed(s.recordingUrl))||(httpsUrl(s.recordingUrl)&&/\.(mp4|webm)$/i.test(new URL(s.recordingUrl).pathname))) && (s.summaryPdfUrl===undefined||(httpsUrl(s.summaryPdfUrl)&&new URL(s.summaryPdfUrl).pathname.toLowerCase().endsWith('.pdf'))) && (s.cancelled === undefined || typeof s.cancelled === 'boolean') && optional(s.prepare, 2000) && (s.relatedIds === undefined || (Array.isArray(s.relatedIds) && s.relatedIds.length <= 6 && new Set(s.relatedIds).size === s.relatedIds.length && s.relatedIds.every(r => typeof r === 'string' && /^(idea|writing):\S{1,150}$/.test(r))))) && ids(c.sessions))
  const discoveryValid = c.discoveries === undefined || (Array.isArray(c.discoveries) && c.discoveries.length <= 500 && c.discoveries.every(d => d && required(d.id, 150) && required(d.title, 150) && ['علوم', 'ثقافة', 'تجارب'].includes(d.category) && text(d.time, 50) && text(d.intro, 1000) && required(d.text, 50000)) && ids(c.discoveries))
  const quizValid = c.quiz === undefined || (Array.isArray(c.quiz) && c.quiz.length <= 100 && c.quiz.every(q => q && required(q.title, 300) && required(q.why, 2000) && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6 && q.options.every(o => required(o, 300)) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length))
  return (c.books===undefined||validBooks(c.books)) && (c.site === undefined || validSite(c.site)) && discoveryValid && quizValid && ideasValid && sessionsValid && text(c.bio, 10000) && Array.isArray(c.writings) && c.writings.length <= 500 &&
    c.writings.every(w => w && text(w.id, 150) && text(w.title, 150) && text(w.text, 50000) && (w.publishedAt===undefined||(/^\d{4}-\d{2}-\d{2}$/.test(w.publishedAt)&&Number.isFinite(Date.parse(w.publishedAt))&&new Date(w.publishedAt).toISOString().slice(0,10)===w.publishedAt)) && (w.format===undefined||['plain','markdown'].includes(w.format)) && ['شعر', 'تأملات', 'فلسفة', 'علوم', 'ثقافة'].includes(w.category)) && ids(c.writings) &&
    Array.isArray(c.media) && c.media.length <= 500 && c.media.every(m => m && text(m.id, 150) && text(m.title, 150) && ['صورة', 'فيديو'].includes(m.type) && typeof m.url === 'string' && (httpsUrl(m.url) || /^\/images\/[^\s]+$/.test(m.url) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(m.url)) && (m.purpose === undefined || (m.type === 'صورة' ? m.purpose === 'حكمة بصرية' : m.purpose === 'درس مرئي')) && optional(m.description, 10000) && optional(m.source, 1000) && (m.thumbnail === undefined || httpsUrl(m.thumbnail)) && (m.uploadedAt === undefined || (typeof m.uploadedAt === 'string' && Number.isFinite(Date.parse(m.uploadedAt))))) && ids(c.media)
}
