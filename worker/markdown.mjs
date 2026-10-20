// Markdown for agents: converts a server-rendered page's <main> into clean Markdown.
// The markup comes from our own React renderer (no nested-tag surprises), so targeted rewrites suffice.
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ','#39':"'"}
const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi,(all,code)=>code[0]==='#'?String.fromCodePoint(code[1]==='x'||code[1]==='X'?parseInt(code.slice(2),16):Number(code.slice(1))):entities[code.toLowerCase()]??all)
const attr=(tag,name)=>decode(tag.match(new RegExp(`\\s${name}="([^"]*)"`,'i'))?.[1]??'')
const inline=text=>text.replace(/\s+/g,' ').trim()

export function wantsMarkdown(request){
 const accept=request.headers.get('accept')||''
 return accept.split(',').some(part=>{const [type,...params]=part.trim().split(';');return type.trim().toLowerCase()==='text/markdown'&&!params.some(p=>/^\s*q=0(\.0*)?\s*$/.test(p))})
}

export function htmlToMarkdown(html,origin){
 const absolute=href=>{try{return new URL(href,origin+'/').toString()}catch{return href}}
 let md=(html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i)?.[1]??html)
  .replace(/<(script|style|svg|noscript|template|button|select|textarea|form|nav|progress|label)\b[^>]*>[\s\S]*?<\/\1>/gi,'')
  .replace(/<input\b[^>]*>/gi,'')
  .replace(/<img\b[^>]*>/gi,tag=>attr(tag,'alt')?`![${attr(tag,'alt')}](${absolute(attr(tag,'src'))})`:'')
  .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi,(all,attrs,text)=>{const label=inline(text.replace(/<[^>]+>/g,' '));const href=attr(' '+attrs,'href');return label?(href?` [${label}](${absolute(href)}) `:label):''})
  .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,(all,level,text)=>`\n\n${'#'.repeat(Number(level))} ${inline(text.replace(/<[^>]+>/g,' '))}\n\n`)
  .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi,(all,tag,text)=>inline(text)?`**${inline(text)}**`:'')
  .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi,(all,tag,text)=>inline(text)?`*${inline(text)}*`:'')
  .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,(all,text)=>`\n\n${text.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'\n').split('\n').map(inline).filter(Boolean).map(line=>`> ${line}`).join('\n')}\n\n`)
  .replace(/<li\b[^>]*>/gi,'\n- ').replace(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi,(all,text)=>`\n**${inline(text.replace(/<[^>]+>/g,''))}**: `)
  .replace(/<hr\b[^>]*>/gi,'\n\n---\n\n').replace(/<br\s*\/?>/gi,'\n')
  .replace(/<\/?(p|div|section|article|figure|figcaption|header|footer|aside|ul|ol|dl|table|tr)\b[^>]*>/gi,'\n\n')
  .replace(/<[^>]+>/g,' ')
 md=decode(md).split('\n').map(line=>line.replace(/[ \t]+/g,' ').trim()).join('\n')
 return md.replace(/\n(- |\*\*)/g,'\n$1').replace(/\n{3,}/g,'\n\n').trim()+'\n'
}

export function pageMarkdown(html,info,origin){
 const lang=info.path==='/en'||info.path.startsWith('/en/')?'en':'ar'
 const meta=[['title',info.title],['description',info.description],['url',origin+info.path],['lang',lang]].map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join('\n')
 return `---\n${meta}\n---\n\n${htmlToMarkdown(html,origin)}`
}

// Rough token estimate (no tokenizer in the Worker): ~4 bytes per token across Arabic and English.
export const markdownTokens=text=>Math.ceil(new TextEncoder().encode(text).length/4)
