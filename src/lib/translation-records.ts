export type TranslationKey='bio'|`writing:${string}`
export type TranslationRecord={locale:'en';title:string;text:string;sourceHash:string}
export type TranslationCatalogue=Partial<Record<TranslationKey,TranslationRecord>>
export function validTranslationCatalogue(value:unknown):value is TranslationCatalogue{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>501)return false
 return Object.entries(value).every(([key,record])=>{
  // eslint-disable-next-line no-control-regex -- control characters are rejected deliberately.
  if(key!=='bio'&&!/^writing:[^\u0000-\u001f]{1,150}$/.test(key))return false
  if(!record||typeof record!=='object'||Array.isArray(record))return false
  const r=record as Record<string,unknown>
  return Object.keys(r).length===4&&Object.keys(r).every(k=>['locale','title','text','sourceHash'].includes(k))&&r.locale==='en'&&typeof r.title==='string'&&r.title.length<=300&&(key==='bio'||Boolean(r.title.trim()))&&typeof r.text==='string'&&Boolean(r.text.trim())&&r.text.length<=60000&&typeof r.sourceHash==='string'&&/^[0-9a-f]{64}$/.test(r.sourceHash)
 })
}
