export type MusicTrack={id:string;title:string;url:string;kind?:'music'|'video'}
export const defaultMusic:MusicTrack[]=[{id:'reading-music',title:'موسيقى هادئة للقراءة · 12 ساعة',url:'https://www.youtube-nocookie.com/embed/vqwnTNRtQ80?list=RDvqwnTNRtQ80'}]
// Retain validated IDs only, never arbitrary iframe HTML or player parameters.
export function musicEmbed(input:string):string|null{
 if(input.length>2000)return null
 const src=input.trim().startsWith('<iframe')?input.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]:input.trim()
 if(!src)return null
 try{
  const u=new URL(src.replace(/&amp;/g,'&'))
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null
  let id:string|undefined
  if(u.hostname==='youtu.be')id=u.pathname.slice(1)
  else if(['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)){
   if(u.pathname==='/watch')id=u.searchParams.get('v')??undefined
   else if(u.pathname.startsWith('/embed/'))id=u.pathname.slice(7)
  }
  if(!id||!/^[\w-]{11}$/.test(id))return null
  const list=u.searchParams.get('list')
  if(list&&!/^[\w-]{1,100}$/.test(list))return null
  return `https://www.youtube-nocookie.com/embed/${id}${list?'?list='+list:''}`
 }catch{return null}
}
export function validMusic(value:unknown):value is MusicTrack[]{
 if(Array.isArray(value)&&value.some(v=>v?.kind!==undefined&&!['music','video'].includes(v.kind)))return false
 return Array.isArray(value)&&value.length<=12&&value.every(v=>v&&typeof v.id==='string'&&/^[\w-]{1,80}$/.test(v.id)&&typeof v.title==='string'&&v.title.trim().length>0&&v.title.length<=160&&typeof v.url==='string'&&Boolean(musicEmbed(v.url)))&&new Set(value.map(v=>v.id)).size===value.length
}
