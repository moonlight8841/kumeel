import {readFile,readdir} from 'node:fs/promises'
const directory='.wrangler/publish/'
const source=await readFile(directory+'index.js','utf8')
const start=Number(process.argv[2]??0)
const modules={}
if(start===0)for(const name of await readdir(directory))if(name.endsWith('.html'))modules[name]=await readFile(directory+name,'utf8')
console.log(JSON.stringify({total:source.length,chunk:source.slice(start,start+50000),modules}))
