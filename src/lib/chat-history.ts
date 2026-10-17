export type ChatSource={title:string;href:string}
export type ChatMessage={role:'user'|'model';text:string;sources?:ChatSource[];followUp?:string}
export function safeChatHistory(value:unknown):ChatMessage[]{
 if(!Array.isArray(value))return []
 return value.slice(-16).flatMap(v=>{
  if(!v||typeof v!=='object'||!['user','model'].includes(v.role)||typeof v.text!=='string'||!v.text.trim()||v.text.length>3000)return []
  const sources:ChatSource[]=Array.isArray(v.sources)?v.sources.filter((s:ChatSource)=>s&&typeof s.title==='string'&&s.title.length<=300&&typeof s.href==='string'&&/^\/(?:about|explore|salon|writings\/[^/?#\\]+|ideas\/[^/?#\\]+|library\/[^/?#\\]+)$/.test(s.href)&&![...s.href].some(c=>c.charCodeAt(0)<=32)).slice(0,3):[]
  return [{role:v.role,text:v.text,sources,...(typeof v.followUp==='string'&&v.followUp.length<=300?{followUp:v.followUp}:{})}]
 })
}
