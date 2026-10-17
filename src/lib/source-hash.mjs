export async function sha256(text){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
}
export function sourceText(content,key){
 if(key==='bio'){
  if(typeof content.bio!=='string'||content.bio.includes('\0'))throw new Error('Invalid biography source')
  return 'kumeel-translation-v1\nbio\n'+content.bio
 }
 if(typeof key!=='string'||!key.startsWith('writing:'))throw new Error('Unknown translation source')
 const writing=content.writings.find(w=>w.id===key.slice(8))
 if(!writing||[writing.title,writing.text,writing.format??'plain'].some(v=>typeof v!=='string'||v.includes('\0')))throw new Error('Missing or invalid writing source')
 return 'kumeel-translation-v1\nwriting\n'+writing.title+'\0'+writing.text+'\0'+(writing.format??'plain')
}
export async function sourceDigest(content,key){return sha256(sourceText(content,key))}
