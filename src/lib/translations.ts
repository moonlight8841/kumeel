import {validContent,type Content} from '../content'
import {sourceDigest} from './source-hash.mjs'
import {resolvePublishedTranslations} from './localized-content'
import {validTranslationCatalogue,type TranslationKey,type TranslationRecord,type TranslationCatalogue} from './translation-records'
export {validTranslationCatalogue}
export type {TranslationKey,TranslationRecord,TranslationCatalogue}
export type OwnerDraft=Content&{translationDrafts?:TranslationCatalogue}
export function validOwnerDraft(value:unknown):value is OwnerDraft{
 if(!value||typeof value!=='object'||Array.isArray(value))return false
 const {translationDrafts,...content}=value as OwnerDraft
 return validContent(content)&&(translationDrafts===undefined||validTranslationCatalogue(translationDrafts))
}
export async function approveTranslation(record:TranslationRecord,content:Content,key:TranslationKey):Promise<TranslationRecord>{
 if(!validTranslationCatalogue({[key]:record})||record.sourceHash!==await sourceDigest(content,key))throw new Error('تغيّر الأصل؛ راجع الترجمة قبل اعتمادها.')
 return {...record}
}
export async function publicPayload(draft:OwnerDraft):Promise<Content>{
 if(!validOwnerDraft(draft))throw new Error('مسودة الترجمة غير صالحة.')
 return resolvePublishedTranslations(draft)
}
export type TranslationSource={key:TranslationKey;label:string;title:string;text:string;format:'plain'|'markdown'}
export function translationSources(content:Content):TranslationSource[]{
 return [{key:'bio',label:'النبذة',title:'',text:content.bio,format:'plain'},...content.writings.map(w=>({key:`writing:${w.id}` as const,label:w.title,title:w.title,text:w.text,format:w.format??'plain'}))]
}
const withEntry=(catalogue:TranslationCatalogue|undefined,key:TranslationKey,record?:TranslationRecord):TranslationCatalogue|undefined=>{
 const next={...catalogue};if(record)next[key]=record;else delete next[key]
 return Object.keys(next).length?next:undefined
}
const withCatalogue=<K extends 'translations'|'translationDrafts'>(draft:OwnerDraft,field:K,catalogue:TranslationCatalogue|undefined):OwnerDraft=>{
 const next={...draft};if(catalogue)next[field]=catalogue;else delete next[field]
 return next
}
// Saving stamps the source the owner is looking at; it never changes the approved copy.
export async function savePrivateTranslation(draft:OwnerDraft,key:TranslationKey,{title,text}:{title:string;text:string}):Promise<OwnerDraft>{
 const record:TranslationRecord={locale:'en',title,text,sourceHash:await sourceDigest(draft,key)}
 if(!validTranslationCatalogue({[key]:record}))throw new Error(key==='bio'?'اكتب نص الترجمة (حتى ٦٠٬٠٠٠ حرف).':'اكتب عنوان الترجمة ونصها (العنوان حتى ٣٠٠ حرف).')
 return withCatalogue(draft,'translationDrafts',withEntry(draft.translationDrafts,key,record))
}
// A model response is kept only when the source still matches what was sent.
export async function acceptGeneratedTranslation(draft:OwnerDraft,key:TranslationKey,requestedHash:string,result:{title:string;text:string}):Promise<OwnerDraft|null>{
 try{if(await sourceDigest(draft,key)!==requestedHash)return null}catch{return null}
 return savePrivateTranslation(draft,key,result)
}
export async function approvePrivateTranslation(draft:OwnerDraft,key:TranslationKey):Promise<OwnerDraft>{
 const record=draft.translationDrafts?.[key]
 if(!record)throw new Error('لا توجد ترجمة خاصة لاعتمادها.')
 return withCatalogue(draft,'translations',withEntry(draft.translations,key,await approveTranslation(record,draft,key)))
}
export const withdrawTranslation=(draft:OwnerDraft,key:TranslationKey)=>withCatalogue(draft,'translations',withEntry(draft.translations,key))
export const discardPrivateTranslation=(draft:OwnerDraft,key:TranslationKey)=>withCatalogue(draft,'translationDrafts',withEntry(draft.translationDrafts,key))
export type RecordState='none'|'current'|'stale'
export async function translationStatus(draft:OwnerDraft,key:TranslationKey):Promise<{approved:RecordState;draft:RecordState;pending:boolean}>{
 let hash=''
 try{hash=await sourceDigest(draft,key)}catch{/* A removed source makes every copy stale. */}
 const state=(record?:TranslationRecord):RecordState=>!record?'none':record.sourceHash===hash?'current':'stale'
 const approved=draft.translations?.[key],pending=draft.translationDrafts?.[key]
 const same=Boolean(approved&&pending&&approved.title===pending.title&&approved.text===pending.text&&approved.sourceHash===pending.sourceHash)
 return {approved:state(approved),draft:state(pending),pending:(Boolean(pending)&&!same)||state(approved)==='stale'}
}
