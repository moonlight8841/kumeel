import {readFile} from 'node:fs/promises'
const config=JSON.parse(await readFile(new URL('../src/supabase-config.json',import.meta.url),'utf8'))
for(const table of ['kumeel_published','kumeel_teacher_profiles','kumeel_community_posts']){
 const columns=table==='kumeel_teacher_profiles'?'id,name,specialty,bio,approach,audience,languages,published_at':table==='kumeel_published'?'content,revision':'id'
 const response=await fetch(`${config.url}/rest/v1/${table}?select=${columns}&limit=1`,{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(15000)})
 const data=await response.json()
 const content=Array.isArray(data)?data[0]?.content:undefined
 console.log(JSON.stringify({table,status:response.status,rows:Array.isArray(data)?data.length:undefined,error:data.code,content:content?{writings:content.writings?.length,ideas:content.ideas?.length,samples:content.ideas?.filter(i=>i.sample).length}:undefined}))
}
