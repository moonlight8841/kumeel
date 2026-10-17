import type {Content} from '../content'
import {sourceDigest} from './source-hash.mjs'
import {validTranslationCatalogue,type TranslationCatalogue,type TranslationKey} from './translation-records'
export async function resolvePublishedTranslations(content:Content):Promise<Content>{
 const translations:TranslationCatalogue={}
 if(validTranslationCatalogue(content.translations))for(const [key,record] of Object.entries(content.translations)){
  if(!record)continue
  try{if(record.sourceHash===await sourceDigest(content,key))translations[key as TranslationKey]={...record}}catch{/* Removed or malformed source is not public. */}
 }
 const {bio,writings,media,ideas,sessions,site,discoveries,quiz,books}=content
 return {bio,writings,media,ideas,sessions,site,discoveries,quiz,books,...(Object.keys(translations).length?{translations}:{})}
}
