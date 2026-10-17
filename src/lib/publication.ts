import {legacyContent,type Content,type Writing} from '../content'
import {approvedWritings} from '../approved-writings'

export function isStarterWriting(writing:Writing){
 return legacyContent.writings.some(seed=>seed.id===writing.id&&seed.text===writing.text)
}

// Upgrade only exact old templates; preserve all edited or independently added work.
export function adoptApprovedWritings(content:Content):Content{
 const existing=new Set(content.writings.filter(w=>!isStarterWriting(w)).map(w=>w.id))
 return {...content,writings:content.writings.flatMap(w=>{
  const index=legacyContent.writings.findIndex(seed=>seed.id===w.id&&seed.text===w.text)
  if(index<0)return [w]
  const approved=approvedWritings[index]
  if(existing.has(approved.id))return []
  existing.add(approved.id)
  return [{...approved}]
 })}
}

// Keep editorial templates in the owner's notebook, outside the reader's edition.
export function readerContent(content:Content):Content{
 content=adoptApprovedWritings(content)
 const clean={...content} as Content&{translationDrafts?:unknown}
 delete clean.translationDrafts
 return {...clean,writings:content.writings.filter(w=>!isStarterWriting(w)),ideas:(content.ideas??[]).filter(i=>!i.sample)}
}
