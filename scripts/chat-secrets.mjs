// Credential provisioning only. Never prints secret values or passes them in argv.
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs'
import {randomBytes,createHash} from 'node:crypto'
import {parseEnv} from 'node:util'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
process.chdir(fileURLToPath(new URL('../',import.meta.url)))
const mode=process.argv[2]
if(!['init','hash','upload'].includes(mode))throw new Error('Usage: node scripts/chat-secrets.mjs init|hash|upload')
if(mode==='init'){
 if(existsSync('.dev.vars'))throw new Error('.dev.vars exists; refusing to replace credentials')
 const source=parseEnv(readFileSync('.env.local','utf8'))
 if(!source.GEMINI_API_KEY)throw new Error('GEMINI_API_KEY missing in .env.local')
 const secret=randomBytes(48).toString('base64url')
 writeFileSync('.dev.vars',`GEMINI_API_KEY=${JSON.stringify(source.GEMINI_API_KEY)}\nCHAT_RATE_SECRET=${JSON.stringify(secret)}\n`,{flag:'wx',mode:0o600})
 console.log('Created private .dev.vars (0600); no credentials displayed.')
}else{
 if((statSync('.dev.vars').mode&0o077)!==0)throw new Error('.dev.vars must be private (0600)')
 const env=parseEnv(readFileSync('.dev.vars','utf8'))
 if(!env.GEMINI_API_KEY||!env.CHAT_RATE_SECRET||env.CHAT_RATE_SECRET.length<48)throw new Error('Required secrets missing or invalid')
 if(mode==='hash')console.log(createHash('sha256').update(env.CHAT_RATE_SECRET).digest('hex'))
 else{
  const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk'],{
   input:JSON.stringify({GEMINI_API_KEY:env.GEMINI_API_KEY,CHAT_RATE_SECRET:env.CHAT_RATE_SECRET}),
   env:{...process.env,CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'},encoding:'utf8',timeout:120000,
  })
  // Do not forward provider output, which could include credentials on failure.
  if(result.error||result.status!==0)throw new Error('Secret upload failed; inspect Cloudflare access without displaying credentials')
  console.log('Uploaded only GEMINI_API_KEY and CHAT_RATE_SECRET to configured Worker.')
 }
}
