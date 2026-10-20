// Notifies IndexNow search engines (Bing, Yandex, Seznam, Naver, Yep) of every URL in the live sitemap.
// Run after a deploy that adds or changes public pages: node scripts/indexnow.mjs
import {readdir} from 'node:fs/promises'

const origin='https://kumeelalnahab.com'
const key=(await readdir('public')).map(f=>f.match(/^([0-9a-f]{32})\.txt$/)?.[1]).find(Boolean)
if(!key)throw new Error('IndexNow key file public/<32-hex>.txt is missing.')
if((await (await fetch(`${origin}/${key}.txt`)).text()).trim()!==key)throw new Error('The key file is not deployed yet; deploy first.')
const sitemap=await (await fetch(`${origin}/sitemap.xml`)).text()
const urlList=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'))
const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:new URL(origin).host,key,keyLocation:`${origin}/${key}.txt`,urlList})})
console.log(`IndexNow: submitted ${urlList.length} URLs, HTTP ${response.status}${response.ok?'':` ${await response.text()}`}`)
if(!response.ok)process.exitCode=1
