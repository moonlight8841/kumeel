// Published sparring rounds: an AI objection and the author's reply, chosen by the owner.
export const sparringStyles=['logic','history','skeptic'] as const
export type SparringStyle=typeof sparringStyles[number]
export const styleLabel:Record<SparringStyle,string>={logic:'المنطقي',history:'المؤرّخ',skeptic:'المتشكك'}
export type ExchangeRound={style:SparringStyle;objection:string;reply:string;publishedAt:string}
export const MAX_ROUNDS=5
const keys=['style','objection','reply','publishedAt']

export function validExchange(value:unknown):value is ExchangeRound[]{
 return Array.isArray(value)&&value.length>=1&&value.length<=MAX_ROUNDS&&value.every(r=>{
  if(!r||typeof r!=='object'||Array.isArray(r))return false
  const v=r as Record<string,unknown>
  return Object.keys(v).every(k=>keys.includes(k))
   &&sparringStyles.includes(v.style as SparringStyle)
   &&typeof v.objection==='string'&&v.objection.trim().length>=20&&v.objection.length<=2000
   &&typeof v.reply==='string'&&v.reply.trim().length>=1&&v.reply.length<=4000
   &&typeof v.publishedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.publishedAt)&&Number.isFinite(Date.parse(v.publishedAt))
 })
}
