// One-time (idempotent) setup of the members-only "majlis" audio room call type on Stream.
// Run: node scripts/setup-stream-video.mjs   (reads STREAM_API_SECRET from the environment or .dev.vars)
import {readFileSync} from 'node:fs'
import {signJwt} from '../api/stream-chat.mjs'
import {MAJLIS_CALL_TYPE,majlisCallType} from '../api/stream-video-config.mjs'

const apiKey=process.env.STREAM_API_KEY||'68adrwg26x8a'
let secret=process.env.STREAM_API_SECRET
if(!secret){try{secret=readFileSync('.dev.vars','utf8').match(/^STREAM_API_SECRET=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'')}catch{/* Falls through to the error below. */}}
if(!secret){console.error('STREAM_API_SECRET is missing (environment or .dev.vars).');process.exit(1)}

const auth=await signJwt({server:true,iat:Math.floor(Date.now()/1000)},secret)
const call=(method,path,body)=>fetch(`https://video.stream-io-api.com/api/v2/video${path}?api_key=${encodeURIComponent(apiKey)}`,{method,headers:{Authorization:auth,'Stream-Auth-Type':'jwt','Content-Type':'application/json'},body:body&&JSON.stringify(body)})

const existing=await call('GET',`/calltypes/${MAJLIS_CALL_TYPE}`)
const {grants,settings}=majlisCallType
const response=existing.ok?await call('PUT',`/calltypes/${MAJLIS_CALL_TYPE}`,{grants,settings}):await call('POST','/calltypes',{name:MAJLIS_CALL_TYPE,grants,settings})
const body=await response.json().catch(()=>({}))
if(!response.ok){console.error(`Failed (${response.status}):`,body.message??body);process.exit(1)}
console.log(`${existing.ok?'Updated':'Created'} call type "${MAJLIS_CALL_TYPE}". Anonymous grants:`,JSON.stringify(body.grants?.anonymous??[]),'user grants:',(body.grants?.user??[]).join(','))
