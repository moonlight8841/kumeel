import {createContext,createElement,forwardRef,useContext,type ComponentType,type ReactNode} from 'react'
import catalogue from './english-catalogue.json'
import {localePath,resolveLocalePath,type Locale} from './i18n'

export const LocaleContext=createContext<Locale>('ar')
export const useLocale=()=>useContext(LocaleContext)
const dictionary:Record<string,string>=catalogue
const normal=(text:string)=>text.trim().replace(/\s+/g,' ')
const patterns=Object.entries(dictionary).filter(([source])=>/\{\d+\}/.test(source)).map(([source,target])=>({
 source:new RegExp('^'+source.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?'(.+?)':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$'),target,
}))
export function englishText(text:string):string{
 const source=normal(text)
 if(!/[\u0600-\u06ff]/.test(source))return text
 let translated=dictionary[source]
 if(!translated)for(const pattern of patterns){const match=source.match(pattern.source);if(match){translated=pattern.target.replace(/\{(\d+)\}/g,(_,index)=>match[Number(index)+1]??'');break}}
 if(!translated&&text.includes('\n\n'))return text.split('\n\n').map(englishText).join('\n\n')
 // Untranslated member-authored content remains in its original language.
 // Never generate translations in the visitor's browser or mislabel them reviewed.
 if(!translated)return text
 return text.match(/^\s*/)?.[0]+translated+text.match(/\s*$/)?.[0]
}
function localNode(node:ReactNode):ReactNode{
 if(typeof node==='string')return englishText(node)
 return Array.isArray(node)?node.map(localNode):node
}
export function localizedHref(href:string,locale:Locale):string{
 if(locale==='ar'||!href.startsWith('/')||href.startsWith('//'))return href
 const [pathname,...tail]=href.split(/(?=[?#])/)
 if(resolveLocalePath(pathname).locale==='en')return href
 try{return localePath(locale,pathname)+tail.join('')}catch{return href}
}
type Elements={ [Tag in keyof JSX.IntrinsicElements]:ComponentType<JSX.IntrinsicElements[Tag]> }
// Typed native-element wrappers keep the same event/ref contracts and DOM output.
// Only presentation strings are translated; form values and API enums are untouched.
const cache=new Map<string,ComponentType<Record<string,unknown>>>()
export const L=new Proxy({} as Elements,{get(_target,tag:string){
 if(!cache.has(tag)){
  const Element=forwardRef<HTMLElement,Record<string,unknown>>(function LocalizedElement(props,ref){
   const locale=useLocale()
   if(locale==='ar')return createElement(tag,{...props,ref})
   const next:Record<string,unknown>={...props,ref}
   if(tag==='option'&&props.value===undefined&&typeof props.children==='string')next.value=props.children
   for(const key of ['aria-label','title','placeholder','alt'])if(typeof next[key]==='string')next[key]=englishText(next[key] as string)
   if(typeof next.href==='string'&&!next.hrefLang)next.href=localizedHref(next.href,locale)
   if(next.dir==='rtl')next.dir='ltr'
   if(next.lang==='ar'&&!next.hrefLang)next.lang='en'
   if(tag!=='script'&&tag!=='style')next.children=localNode(props.children as ReactNode)
   if(typeof next.children==='string'&&/[\u0621-\u064a]/.test(next.children)&&!next.hrefLang){next.lang='ar';next.dir='auto'}
   return createElement(tag,next)
  })
  cache.set(tag,Element as ComponentType<Record<string,unknown>>)
 }
 return cache.get(tag)
}})
