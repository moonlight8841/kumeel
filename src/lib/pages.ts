import { initialContent, youtubeEmbed, type Content, type Idea, type Media, type Writing } from '../content'
import {booksFor,type Book} from '../books'

export type PageInfo = { path: string; kind: 'teachers' | 'community' | 'member' | 'admin' | 'home' | 'about' | 'observatory' | 'salon' | 'library' | 'book' | 'idea' | 'writing' | 'writings' | 'explore' | 'media' | 'missing'; title: string; description: string; noindex: boolean; idea?: Idea; writing?: Writing; media?: Media; book?:Book }
export const ownerName = 'كميل ال نهاب'
const excerpt = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 160)
export function pageInfo(content: Content, pathname = '/'): PageInfo {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/'
  const page = (kind: PageInfo['kind'], title: string, description: string, noindex = false): PageInfo => ({ path, kind, title: `${title} | ${ownerName}`, description: excerpt(description), noindex })
  if (path === '/teachers') return page('teachers','مجلس التعلّم والمعلمون','اكتشف المعلمين وأساليب التعليم في مجتمع كميل.')
  if (path === '/community') return page('community','مجتمع كميل','مساهمات عربية في الفلسفة والعلم والثقافة، ونقاشات تراجعها إدارة منصة كميل قبل النشر.')
  if (path === '/member') return page('member','مساحة العضو','مسودات ومساهمات أعضاء مجتمع كميل.',true)
  if (path === '/admin') return page('admin', 'لوحة الإدارة', 'إدارة محتوى وتصميم منصة كميل ال نهاب.', true)
  if (path === '/') return page('home', 'الفلسفة والعلم والحوار', 'مساحة كميل ال نهاب للفلسفة والعلم والثقافة. أفكار وحكم ودروس مرئية وأسئلة نختبرها معًا في مجلس الحوار.')
  if (path === '/explore') return page('explore','اكتشف','قراءات وتجارب علمية وثقافية في منصة كميل.')
  if (path === '/writings') return page('writings','الكتابات والتأملات','كتابات كميل ال نهاب في الفلسفة والعلم والثقافة والتأمل والشعر.')
  if (path === '/about') return page('about', 'من هو كميل ال نهاب؟', content.bio)
  if (path === '/observatory') return page('observatory', 'مرصد الأفكار', 'حكم وتأملات ودروس وتجارب فكرية. ننصف الاعتراض ونبحث عن الدليل مع كميل ال نهاب.')
  if (path === '/salon') return page('salon', 'مجلس الحوار', 'مواعيد لقاءات كميل ال نهاب للنقاش والتعلّم، والأسئلة المحورية وروابط الجلسات.')
  if (path === '/library') return page('library','مكتبة الكتب','مكتبة كميل ال نهاب: كتب في الفلسفة وتعلّم الإنجليزية، مع البحث ورفّ قراءة شخصي.')
  if(path.startsWith('/library/')){
    const book=booksFor(content).find(b=>`/library/${b.id}`===path)
    if(book)return {...page('book',book.title,`${book.subtitle}. ${book.description} · ${book.author}`),book}
  }
  const match = /^\/(ideas|writings|media)\/([^/]+)$/.exec(path)
  if (match) {
    let id: string
    try { id = decodeURIComponent(match[2]) } catch { return page('missing', 'الصفحة غير موجودة', 'تعذّر العثور على الصفحة المطلوبة.', true) }
    if (match[1] === 'ideas') {
      const idea = (content.ideas ?? initialContent.ideas ?? []).find(i => i.id === id)
      if (idea) return { ...page('idea', idea.title, idea.text, Boolean(idea.sample)), path: `/ideas/${encodeURIComponent(id)}`, idea }
    }
    if (match[1] === 'writings') {
      const writing = content.writings.find(w => w.id === id)
      // Starter prose is explicitly illustrative, rather than verified work by the owner.
      if (writing) return { ...page('writing', writing.title, writing.text, initialContent.writings.some(w => w.id === id && w.text === writing.text)), path: `/writings/${encodeURIComponent(id)}`, writing }
    }
    if (match[1] === 'media') {
      const media = content.media.find(m => m.id === id && m.purpose && m.description?.trim())
      if (media) return { ...page('media', media.title, media.description || media.title), path: `/media/${encodeURIComponent(id)}`, media }
    }
  }
  return page('missing', 'الصفحة غير موجودة', 'تعذّر العثور على الصفحة المطلوبة. يمكنك العودة إلى مرصد الأفكار.', true)
}
export function publicPaths(content: Content): string[] {
  return ['/', '/teachers', '/community', '/about', '/observatory', '/salon', '/library', '/writings', '/explore', ...booksFor(content).map(b=>`/library/${b.id}`), ...(content.ideas ?? []).filter(i => !i.sample).map(i => `/ideas/${encodeURIComponent(i.id)}`), ...content.writings.filter(w => !pageInfo(content, `/writings/${encodeURIComponent(w.id)}`).noindex).map(w => `/writings/${encodeURIComponent(w.id)}`), ...content.media.filter(m => m.purpose && m.description?.trim() && !m.url.startsWith('data:')).map(m => `/media/${encodeURIComponent(m.id)}`)]
}
const htmlEscape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
export function structuredData(_content: Content, info: PageInfo, origin = '') {
  const canonical = origin ? `${origin}${info.path}` : undefined
  const person = { '@type': 'Person', '@id': origin ? `${origin}/#person` : '#person', name: ownerName, alternateName: ['كميل آل نهاب', 'Kumeel Al Nahab'], url: origin ? `${origin}/about` : undefined }
  let main: Record<string, unknown> = { '@type': info.kind === 'home' || info.kind === 'about' ? 'ProfilePage' : 'CollectionPage', name: info.title, description: info.description, url: canonical, inLanguage: 'ar', mainEntity: person }
  if (info.idea || info.writing) {
    main = { '@type': 'Article', headline: info.idea?.title ?? info.writing?.title, description: info.description, articleBody: info.idea?.text ?? info.writing?.text, inLanguage: 'ar', url: canonical, publisher: { '@id': person['@id'] }, author: info.noindex || info.idea?.source ? undefined : { ...person }, citation: info.idea?.sourceUrl, datePublished:info.writing?.publishedAt }
  }
  if (info.media) {
    const m = info.media
    main = { '@type': 'CreativeWork', name: m.title, description: m.description, inLanguage: 'ar', url: canonical, publisher: { '@id': person['@id'] } }
    if (m.type === 'فيديو' && m.thumbnail && m.uploadedAt) main = { ...main, '@type': 'VideoObject', thumbnailUrl: [m.thumbnail], uploadDate: m.uploadedAt, ...(youtubeEmbed(m.url) ? { embedUrl: youtubeEmbed(m.url) } : { contentUrl: m.url }) }
  }
  if(info.book){const b=info.book;main={'@type':'Book',name:b.title,alternateName:b.subtitle,description:b.description,author:{'@type':'Person',name:b.author},inLanguage:b.language,numberOfPages:b.pages,url:canonical,...(b.fileUrl?{encoding:{'@type':'MediaObject',contentUrl:b.fileUrl,encodingFormat:'application/pdf'}}:{})}}
  if(info.kind==='library')main={...main,mainEntity:{'@type':'ItemList',numberOfItems:booksFor(_content).length,itemListElement:booksFor(_content).map((b,i)=>({'@type':'ListItem',position:i+1,url:origin?`${origin}/library/${b.id}`:undefined,name:b.title}))}}
  return { '@context': 'https://schema.org', '@graph': [person, main] }
}
export function renderHead(content: Content, info: PageInfo, origin = ''): string {
  const canonical = origin ? `${origin}${info.path}` : ''
  return `<title>${htmlEscape(info.title)}</title><meta name="description" content="${htmlEscape(info.description)}" /><meta name="robots" content="${info.noindex ? 'noindex, follow' : 'index, follow'}" /><meta property="og:title" content="${htmlEscape(info.title)}" /><meta property="og:description" content="${htmlEscape(info.description)}" /><meta property="og:type" content="${info.idea || info.writing ? 'article' : 'website'}" />${canonical ? `<link rel="canonical" href="${htmlEscape(canonical)}" /><meta property="og:url" content="${htmlEscape(canonical)}" />` : ''}<script type="application/ld+json" id="kumeel-schema">${safeJson(structuredData(content, info, origin))}</script>`
}
export function replaceHead(template: string, head: string) {
  return template.replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<meta\s+(?:name="(?:description|robots)"|property="og:(?:title|description|type|url)")[^>]*>/g, '').replace(/<link\s+rel="canonical"[^>]*>/g, '').replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '').replace('</head>', () => `${head}</head>`)
}
