import { initialContent, legacyContent, youtubeEmbed, type Content, type Idea, type Media, type Writing } from '../content'
import {booksFor,type Book} from '../books'
import {resolveLocalePath,localePath,messages} from './i18n'

export type PageInfo = { path: string; kind: 'teachers' | 'community' | 'member' | 'admin' | 'home' | 'about' | 'observatory' | 'salon' | 'library' | 'book' | 'idea' | 'writing' | 'writings' | 'explore' | 'media' | 'missing'; title: string; description: string; noindex: boolean; idea?: Idea; writing?: Writing; media?: Media; book?:Book }
export const ownerName = 'كميل ال نهاب'
const excerpt = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 160)
export function pageInfo(content: Content, pathname = '/'): PageInfo {
  const route=resolveLocalePath(pathname)
  if(route.locale==='ar')return arabicPageInfo(content,pathname)
  const path=route.supported?localePath('en',route.path):pathname.split('?')[0]
  const m=messages.en
  const page=(kind:PageInfo['kind'],title:string,description:string,noindex=false):PageInfo=>({path,kind,title:`${title} | ${m.owner}`,description:excerpt(description),noindex})
  if(!route.supported)return page('missing',m.notFound,m.unavailable,true)
  if(route.path==='/')return {...page('home',m.owner,m.tagline),title:`${m.owner} | Philosophy, Science and Dialogue`}
  if(route.path==='/about')return page('about',m.about,content.translations?.bio?.text||m.bioEmpty,!content.translations?.bio)
  if(route.path==='/writings')return page('writings',m.writings,m.latest)
  const source=content.writings.find(w=>`/writings/${encodeURIComponent(w.id)}`===route.path)
  const translation=source&&content.translations?.[`writing:${source.id}`]
  if(source&&translation)return {...page('writing',translation.title,translation.text,arabicPageInfo(content,route.path).noindex),writing:{...source,title:translation.title,text:translation.text}}
  return page('missing',m.notFound,m.unavailable,true)
}
function arabicPageInfo(content: Content, pathname = '/'): PageInfo {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/'
  const page = (kind: PageInfo['kind'], title: string, description: string, noindex = false): PageInfo => ({ path, kind, title: `${title} | ${ownerName}`, description: excerpt(description), noindex })
  if (path === '/teachers') return page('teachers','مجلس التعلّم والمعلمون','اكتشف المعلمين وأساليب التعليم في مجتمع كميل.')
  if (path === '/community') return page('community','مجتمع كميل','مساهمات عربية في الفلسفة والعلم والثقافة، ونقاشات تراجعها إدارة منصة كميل قبل النشر.')
  if (path === '/member') return page('member','مساحة العضو','مسودات ومساهمات أعضاء مجتمع كميل.',true)
  if (path === '/admin') return page('admin', 'لوحة الإدارة', 'إدارة محتوى وتصميم منصة كميل ال نهاب.', true)
  if (path === '/') return { ...page('home', 'الفلسفة والعلم والحوار', 'كميل ال نهاب — Kumeel Al Nahab. مساحة شخصية للكتابات والتأملات في الفلسفة والعلم والثقافة والحوار.'), title: `${ownerName} | الفلسفة والعلم والحوار` }
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
      if (writing) return { ...page('writing', writing.title, writing.text, legacyContent.writings.some(w => w.id === id && w.text === writing.text)), path: `/writings/${encodeURIComponent(id)}`, writing }
    }
    if (match[1] === 'media') {
      const media = content.media.find(m => m.id === id && m.purpose && m.description?.trim())
      if (media) return { ...page('media', media.title, media.description || media.title), path: `/media/${encodeURIComponent(id)}`, media }
    }
  }
  return page('missing', 'الصفحة غير موجودة', 'تعذّر العثور على الصفحة المطلوبة. يمكنك العودة إلى مرصد الأفكار.', true)
}
export function publicPaths(content: Content): string[] {
  const en=['/en/','/en/writings']
  if(content.translations?.bio)en.push('/en/about')
  for(const w of content.writings)if(content.translations?.[`writing:${w.id}`]&&!arabicPageInfo(content,`/writings/${encodeURIComponent(w.id)}`).noindex)en.push(`/en/writings/${encodeURIComponent(w.id)}`)
  return [...arabicPublicPaths(content),...en]
}
function arabicPublicPaths(content: Content): string[] {
  return ['/', '/teachers', '/community', '/about', '/observatory', '/salon', '/library', '/writings', '/explore', ...booksFor(content).map(b=>`/library/${b.id}`), ...(content.ideas ?? []).filter(i => !i.sample).map(i => `/ideas/${encodeURIComponent(i.id)}`), ...content.writings.filter(w => !pageInfo(content, `/writings/${encodeURIComponent(w.id)}`).noindex).map(w => `/writings/${encodeURIComponent(w.id)}`), ...content.media.filter(m => m.purpose && m.description?.trim() && !m.url.startsWith('data:')).map(m => `/media/${encodeURIComponent(m.id)}`)]
}
const htmlEscape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
export function structuredData(_content: Content, info: PageInfo, origin = '') {
  const locale=resolveLocalePath(info.path).locale
  const canonical = origin ? `${origin}${info.path}` : undefined
  const person = { '@type': 'Person', '@id': origin ? `${origin}/#person` : '#person', name: ownerName, alternateName: ['كميل آل نهاب', 'Kumeel Al Nahab'], url: origin ? `${origin}/about` : undefined, mainEntityOfPage: { '@id': origin ? `${origin}/about#webpage` : '/about#webpage' } }
  const website = { '@type': 'WebSite', '@id': origin ? `${origin}/#website` : '#website', name: ownerName, alternateName: ['Kumeel Al Nahab', 'كميل آل نهاب'], url: origin ? `${origin}/` : undefined, inLanguage: ['ar', 'en'], publisher: { '@id': person['@id'] } }
  let main: Record<string, unknown> = { '@type': info.kind === 'about' ? 'ProfilePage' : info.kind === 'home' ? 'WebPage' : 'CollectionPage', '@id': canonical ? `${canonical}#webpage` : `${info.path}#webpage`, name: info.title, description: info.description, url: canonical, inLanguage: 'ar', isPartOf: { '@id': website['@id'] }, mainEntity: person }
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
  if(locale==='en'&&info.writing)main={...main,translationOfWork:{'@type':'Article',inLanguage:'ar',url:`${origin}${resolveLocalePath(info.path).path}`}}
  return { '@context': 'https://schema.org', '@graph': [person, {...main,inLanguage:locale}, website] }
}
export function renderHead(content: Content, info: PageInfo, origin = ''): string {
  const canonical = origin ? `${origin}${info.path}` : ''
  const pairs=alternateLinks(content,info.path,origin)
  const alternates=pairs.map(([lang,href])=>`<link rel="alternate" hreflang="${lang}" href="${htmlEscape(href)}" />`).join('')
  const og=openGraphLocale(info.path,pairs.length>0)
  return `${alternates}<title>${htmlEscape(info.title)}</title><meta property="og:site_name" content="${htmlEscape(og.siteName)}" /><meta property="og:locale" content="${og.locale}" />${og.alternate?`<meta property="og:locale:alternate" content="${og.alternate}" />`:''}<meta name="description" content="${htmlEscape(info.description)}" /><meta name="robots" content="${info.noindex ? 'noindex, follow' : 'index, follow'}" /><meta property="og:title" content="${htmlEscape(info.title)}" /><meta property="og:description" content="${htmlEscape(info.description)}" /><meta property="og:type" content="${info.idea || info.writing ? 'article' : 'website'}" />${canonical ? `<link rel="canonical" href="${htmlEscape(canonical)}" /><meta property="og:url" content="${htmlEscape(canonical)}" />` : ''}<script type="application/ld+json" id="kumeel-schema">${safeJson(structuredData(content, info, origin))}</script>`
}
const ogLocales={ar:'ar_SA',en:'en_US'} as const
export function openGraphLocale(path:string,paired:boolean){
 const locale=resolveLocalePath(path).locale
 return {locale:ogLocales[locale],alternate:paired?ogLocales[locale==='en'?'ar':'en']:undefined,siteName:messages[locale].owner}
}
export function alternateLinks(content:Content,path:string,origin:string):[string,string][]{
 const route=resolveLocalePath(path)
 if(!origin||!route.supported||pageInfo(content,path).noindex)return []
 let en:string
 try{en=localePath('en',route.path)}catch{return []}
 if(!publicPaths(content).includes(en))return []
 return [['ar',origin+route.path],['en',origin+en],['x-default',origin+route.path]]
}
export function replaceHead(template: string, head: string) {
  return template.replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<meta\s+(?:name="(?:description|robots)"|property="og:(?:title|description|type|url|site_name|locale(?::alternate)?)")[^>]*>/g, '').replace(/<link\s+rel="(?:canonical|alternate)"[^>]*>/g, '').replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '').replace('</head>', () => `${head}</head>`)
}
export function documentLanguage(template:string,path:string):string{
 const locale=resolveLocalePath(path).locale
 return template.replace(/<html\b[^>]*>/i,tag=>tag.replace(/\s+(?:lang|dir)=["'][^"']*["']/g,'').replace(/>$/,` lang="${locale}" dir="${locale==='en'?'ltr':'rtl'}">`))
}
