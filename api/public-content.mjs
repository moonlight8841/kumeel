import {createPublishedLoader} from './_shared/published-loader.mjs'
import { readFile } from 'node:fs/promises'
import { initialContent, validContent, adoptApprovedWritings,readerContent,resolvePublishedTranslations } from '../dist-ssr/entry-server.js'
const config = JSON.parse(await readFile(new URL('../src/supabase-config.json', import.meta.url), 'utf8'))

export function siteOrigin(env = process.env) {
  if (env.SITE_URL) {
    try { const url = new URL(env.SITE_URL); if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) return url.origin } catch { /* Invalid site origins must not enter HTML or sitemaps. */ }
  }
  const host = env.VERCEL_PROJECT_PRODUCTION_URL
  return host && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host) ? `https://${host}` : ''
}
async function read(columns){
 const response=await fetch(`${config.url}/rest/v1/kumeel_published?id=eq.main&select=${columns}`,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(5000)})
 if(!response.ok)throw new Error('Publication unavailable')
 const rows=await response.json();return rows[0]
}
const load=createPublishedLoader({
 readRevision:async()=> (await read('revision'))?.revision,
 readSnapshot:()=>read('content,revision'),
 prepare:async(content,{bypass})=>{
  if(!validContent(content))throw new Error('Invalid public content')
  const resolved=await resolvePublishedTranslations(adoptApprovedWritings(content))
  return bypass?resolved:readerContent(resolved)
 },
})
export async function publicContent(options){
 try{return await load(options)}catch{
  console.warn('Published content unavailable')
  return {content:{...initialContent,bio:'',writings:[],ideas:[],sessions:[],media:[],books:[],discoveries:[],quiz:[],translations:undefined},fresh:false}
 }
}
