import {spawn} from 'node:child_process'
import {access} from 'node:fs/promises'

try{await access('dist/template.html')}catch{console.error('Run npm run build before starting the Worker.');process.exit(1)}
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--ip','127.0.0.1',...process.argv.slice(2)],{
 stdio:'inherit',
 env:{...process.env,CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'},
})
child.on('error',error=>{console.error(error.message);process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
