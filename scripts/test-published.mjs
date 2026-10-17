import assert from 'node:assert/strict'
import {promisify} from 'node:util'
import {execFile} from 'node:child_process'
const run=promisify(execFile)
const base=process.env.WORKER_TEST_URL||'https://kumeelalnahab.com'
const curl=process.platform==='win32'?'curl.exe':'curl'
async function request(path,extra=[]){
 const {stdout}=await run(curl,['-sS','--max-time','30','-w','\n%{http_code}',...extra,base+path],{maxBuffer:4_000_000})
 const index=stdout.lastIndexOf('\n')
 return {status:Number(stdout.slice(index+1)),body:stdout.slice(0,index)}
}
let home
for(const [path,status] of [['/',200],['/about',200],['/writings',200],['/writings/peace-and-conflict',200],['/writings/feeling-and-conspiracy',200],['/writings/why-the-brain-deceives',200],['/admin',200],['/member',200],['/ideas/certainty',404],['/writings/meaning',404],['/sitemap.xml',200],['/robots.txt',200],['/api/chat',200]]){
 const response=await request(path)
 assert.equal(response.status,status,path)
 if(path==='/'){home=response.body;assert.ok(home.includes('عندما علمت بما لايجب'));assert.ok(home.includes('شعرت ولم أشعر'))}
 if(path==='/'||path==='/about'){
  assert.ok(response.body.includes(`rel="canonical" href="${base}${path}"`))
  assert.ok(response.body.includes('name="robots" content="index, follow"'))
  const graph=JSON.parse(response.body.match(/<script type="application\/ld\+json" id="kumeel-schema">([\s\S]*?)<\/script>/)[1])['@graph']
  const website=graph.find(n=>n['@type']==='WebSite')
  assert.equal(website.name,'كميل ال نهاب');assert.equal(website.url,base+'/')
  assert.equal(graph.find(n=>n['@type']==='Person').url,base+'/about')
  if(path==='/')assert.ok(response.body.includes('<title>كميل ال نهاب |'))
  if(path==='/about')assert.equal(graph.find(n=>n['@type']==='ProfilePage')['@id'],base+'/about#webpage')
 }
 if(path==='/admin'||path==='/member')assert.ok(response.body.includes('name="robots" content="noindex, follow"'))
 if(path==='/writings/why-the-brain-deceives')assert.ok(response.body.includes('لماذا قد يخدعنا دماغنا في بعض الأحيان'))
 if(path==='/api/chat')assert.equal(JSON.parse(response.body).enabled,process.env.CHAT_EXPECTED_ENABLED!=='false')
 if(path==='/sitemap.xml'){assert.ok(response.body.includes(base+'/writings/peace-and-conflict'));assert.ok(response.body.includes(base+'/about'));assert.ok(!response.body.includes('/admin'));assert.ok(!response.body.includes('/member'))}
 if(path==='/robots.txt'){assert.ok(response.body.includes('Allow: /'));assert.ok(response.body.includes(`Sitemap: ${base}/sitemap.xml`))}
 console.log(`${response.status} ${path}`)
}
for(const resource of [...home.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(m=>m[1])){
 assert.equal((await request(resource)).status,200,resource)
 console.log(`200 ${resource}`)
}
assert.equal((await request('/api/generate-idea',['-X','POST','-H','Content-Type: application/json','-H','X-Kumeel-BFF: 1','-H',`Origin: ${base}`,'--data','{}'])).status,401)
console.log('Published content, sitemap, assets and protected API verified with TLS validation.')
