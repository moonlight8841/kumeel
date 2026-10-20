import type {Writing} from '../content'

export function reflectionExcerpts(writings:Writing[]){
 return writings.filter(w=>w.text.trim()).slice(0,5).map(w=>{
  const text=w.text.trim().replace(/\s+/g,' ')
  const chars=Array.from(text)
  const excerpt=chars.length>220?chars.slice(0,220).join('').replace(/\s+\S*$/,'')+'…':text
  return {text:excerpt,source:w.title,href:`/writings/${encodeURIComponent(w.id)}`}
 })
}
