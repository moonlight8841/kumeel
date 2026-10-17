// Only published snapshots enter this cache. Every read first checks the live revision.
export function createPublishedLoader({readRevision,readSnapshot,prepare=async value=>value}){
 let cached=null,revisionFlight=null,snapshotFlight=null
 const validRevision=value=>Number.isSafeInteger(value)&&value>=1
 async function revision(){
  if(!revisionFlight)revisionFlight=Promise.resolve().then(readRevision).finally(()=>{revisionFlight=null})
  const value=await revisionFlight
  if(!validRevision(value))throw new Error('Invalid publication revision')
  return value
 }
 async function snapshot(bypass){
  const value=await readSnapshot()
  if(!value||!validRevision(value.revision))throw new Error('Invalid publication snapshot')
  return {content:await prepare(value.content,{bypass}),revision:value.revision,fresh:true}
 }
 return async({bypass=false}={})=>{
  if(bypass)return snapshot(true)
  const wanted=await revision()
  if(cached?.revision===wanted)return structuredClone(cached)
  if(!snapshotFlight)snapshotFlight=snapshot(false).finally(()=>{snapshotFlight=null})
  let result=await snapshotFlight
  // A newer revision can be observed while an older fetch is still in flight.
  if(result.revision<wanted)result=await snapshot(false)
  if(result.revision<wanted)throw new Error('Publication revision changed')
  if(!cached||result.revision>=cached.revision)cached=structuredClone(result)
  return structuredClone(result)
 }
}
