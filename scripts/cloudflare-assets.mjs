import {readFile,writeFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
const root=path.resolve('dist')
const {account_id:cloudflareAccountId}=JSON.parse(await readFile('wrangler.jsonc','utf8'))
const manifest={}
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())await walk(full);else{const bytes=await readFile(full);const rel=path.relative(root,full).replaceAll('\\','/');manifest['/'+rel]={hash:createHash('sha256').update(bytes.toString('base64')+path.extname(rel).slice(1)).digest('hex').slice(0,32),size:bytes.length}}}}
await walk(root)
if(process.argv[2]==='manifest'){await writeFile('.secrets/cf-assets-manifest.json',JSON.stringify(manifest));console.log(JSON.stringify(manifest))}
if(process.argv[2]==='upload'){
 const session=JSON.parse(await readFile('.secrets/cf-upload-session.json','utf8'))
 let completion=session.jwt
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.txt':'text/plain','.json':'application/json'}
 for(const bucket of session.buckets??[]){
  const form=new FormData()
  for(const hash of bucket){const [relative]=Object.entries(manifest).find(([,file])=>file.hash===hash);const bytes=await readFile(path.join(root,relative));form.append(hash,new Blob([bytes.toString('base64')],{type:types[path.extname(relative)]??'application/octet-stream'}),hash)}
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/workers/assets/upload?base64=true`,{method:'POST',headers:{Authorization:`Bearer ${session.jwt}`},body:form,signal:AbortSignal.timeout(120000)})
  const data=await response.json()
  if(!response.ok||!data.success)throw new Error('Asset upload failed: '+JSON.stringify(data.errors))
  if(data.result?.jwt)completion=data.result.jwt
  console.log('Uploaded asset bucket: '+bucket.length+' files')
 }
 await writeFile('.secrets/cf-assets-completion.json',JSON.stringify({jwt:completion}))
 console.log('Asset upload completed; token saved privately.')
}
