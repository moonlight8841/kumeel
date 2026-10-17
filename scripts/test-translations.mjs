import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createHash} from 'node:crypto'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {initialContent,validContent}=await server.ssrLoadModule('/src/content.ts')
 const {sourceDigest,sha256}=await server.ssrLoadModule('/src/lib/source-hash.mjs')
 const {validOwnerDraft,validTranslationCatalogue,approveTranslation,publicPayload}=await server.ssrLoadModule('/src/lib/translations.ts')
 const {resolvePublishedTranslations}=await server.ssrLoadModule('/src/lib/localized-content.ts')
 const writing={id:'a',title:'سؤال',text:'نص عربي\nثانٍ',category:'فلسفة',format:'plain'}
 const source={...initialContent,writings:[writing]}
 const sourceHash=await sourceDigest(source,'writing:a')
 const translated={locale:'en',title:'A question',text:'English text.',sourceHash}
 await test('Native source hashes preserve exact source bytes and reject ambiguous framing',async()=>{
  assert.equal(await sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.equal(sourceHash,createHash('sha256').update('kumeel-translation-v1\nwriting\nسؤال\0نص عربي\nثانٍ\0plain').digest('hex'))
  assert.notEqual(await sourceDigest({...source,writings:[{...writing,text:writing.text+' '}]},'writing:a'),sourceHash)
  await assert.rejects(()=>sourceDigest({...source,writings:[{...writing,title:'a\0b'}]},'writing:a'))
  await assert.rejects(()=>sourceDigest(source,'writing:missing'))
 })
 await test('Private drafts are never public content and generating does not approve',async()=>{
  const draft={...source,translationDrafts:{'writing:a':translated}}
  assert.equal(validOwnerDraft(draft),true)
  assert.equal(validContent(draft),false)
  const payload=await publicPayload(draft)
  assert.equal(payload.translationDrafts,undefined)
  assert.equal(payload.translations?.['writing:a'],undefined)
  assert.equal(JSON.stringify(payload).includes('English text.'),false)
  assert.equal(payload.writings[0].text,writing.text)
 })
 await test('Only approved current-source translations survive public projection',async()=>{
  const approved=await approveTranslation(translated,source,'writing:a')
  const published={...source,translations:{'writing:a':approved}}
  assert.equal(validContent(published),true)
  assert.equal((await resolvePublishedTranslations(published)).translations['writing:a'].title,'A question')
  for(const changed of [{text:'مصدر تغير'},{title:'عنوان آخر'},{format:'markdown'}]){
   const edited={...published,writings:[{...writing,...changed}]}
   assert.equal((await resolvePublishedTranslations(edited)).translations?.['writing:a'],undefined)
   await assert.rejects(()=>approveTranslation(translated,edited,'writing:a'))
  }
  assert.equal((await resolvePublishedTranslations({...published,writings:[]})).translations?.['writing:a'],undefined)
  const draft={...published,translationDrafts:{'writing:a':{...translated,text:'PRIVATE-SENTINEL'}}}
  const result=await publicPayload(draft)
  assert.equal(result.translations['writing:a'].text,'English text.')
  assert.equal(JSON.stringify(result).includes('PRIVATE-SENTINEL'),false)
  assert.equal(draft.translationDrafts['writing:a'].text,'PRIVATE-SENTINEL')
 })
 await test('Owner review keeps private drafts, approval and publication as separate steps',async()=>{
  const {savePrivateTranslation,acceptGeneratedTranslation,approvePrivateTranslation,withdrawTranslation,discardPrivateTranslation,translationStatus,translationSources}=await server.ssrLoadModule('/src/lib/translations.ts')
  assert.deepEqual(translationSources(source).map(s=>s.key),['bio','writing:a'])
  assert.deepEqual(await translationStatus(source,'writing:a'),{approved:'none',draft:'none',pending:false})
  // Generating only fills the private entry; nothing becomes public.
  const generated=await acceptGeneratedTranslation(source,'writing:a',sourceHash,{title:'A question',text:'English text.'})
  assert.equal(generated.translationDrafts['writing:a'].text,'English text.')
  assert.equal(generated.translations,undefined)
  assert.equal((await publicPayload(generated)).translations,undefined)
  assert.deepEqual(await translationStatus(generated,'writing:a'),{approved:'none',draft:'current',pending:true})
  // A response for a source that changed while waiting is discarded.
  const editedWhileWaiting={...source,writings:[{...writing,text:'نص جديد'}]}
  assert.equal(await acceptGeneratedTranslation(editedWhileWaiting,'writing:a',sourceHash,{title:'Old',text:'Old.'}),null)
  // Approval copies the reviewed record without touching the private copy or publishing.
  const approved=await approvePrivateTranslation(generated,'writing:a')
  assert.deepEqual(approved.translations['writing:a'],generated.translationDrafts['writing:a'])
  assert.deepEqual(await translationStatus(approved,'writing:a'),{approved:'current',draft:'current',pending:false})
  assert.equal((await publicPayload(approved)).translations['writing:a'].text,'English text.')
  // Further private editing leaves the approved version unchanged.
  const revised=await savePrivateTranslation(approved,'writing:a',{title:'A question',text:'PRIVATE-SENTINEL revision.'})
  assert.equal(revised.translations['writing:a'].text,'English text.')
  assert.equal((await translationStatus(revised,'writing:a')).pending,true)
  assert.equal(JSON.stringify(await publicPayload(revised)).includes('PRIVATE-SENTINEL'),false)
  // Editing the Arabic source requires a new review.
  const sourceEdited={...revised,writings:[{...writing,title:'عنوان آخر'}]}
  assert.deepEqual(await translationStatus(sourceEdited,'writing:a'),{approved:'stale',draft:'stale',pending:true})
  await assert.rejects(()=>approvePrivateTranslation(sourceEdited,'writing:a'))
  const restamped=await savePrivateTranslation(sourceEdited,'writing:a',{title:'Another title',text:'Reviewed again.'})
  const reapproved=await approvePrivateTranslation(restamped,'writing:a')
  assert.equal((await publicPayload(reapproved)).translations['writing:a'].title,'Another title')
  // Withdrawal removes only the public copy; discarding removes only the private copy.
  const withdrawn=withdrawTranslation(reapproved,'writing:a')
  assert.equal(withdrawn.translations,undefined)
  assert.equal(withdrawn.translationDrafts['writing:a'].text,'Reviewed again.')
  assert.equal(discardPrivateTranslation(reapproved,'writing:a').translations['writing:a'].text,'Reviewed again.')
  assert.equal(discardPrivateTranslation(reapproved,'writing:a').translationDrafts,undefined)
  await assert.rejects(()=>savePrivateTranslation(source,'writing:a',{title:'',text:'Untitled writing.'}))
  await assert.rejects(()=>savePrivateTranslation(source,'writing:missing',{title:'T',text:'Text.'}))
  assert.equal((await savePrivateTranslation(source,'bio',{title:'',text:'Biography.'})).translationDrafts.bio.title,'')
  // Backups that carry private drafts restore as drafts, never as public content.
  const backup=JSON.parse(JSON.stringify(revised))
  assert.equal(validOwnerDraft(backup),true);assert.equal(validContent(backup),false)
 })
 await test('Translation records reject unexpected metadata, languages and excessive text',()=>{
  for(const bad of [null,[],{'writing:a':{...translated,locale:'fr'}},{'writing:a':{...translated,notes:'PRIVATE'}},{'writing:a':{...translated,sourceHash:'wrong'}},{'writing:a':{...translated,text:'x'.repeat(60001)}},{'writing:a':{...translated,title:''}},{'wrong':translated}])assert.equal(validTranslationCatalogue(bad),false)
  assert.equal(validTranslationCatalogue({'bio':{...translated,title:''}}),true)
  assert.equal(validOwnerDraft({...source,translationDrafts:null}),false)
  assert.equal(validContent({...source,translations:[]}),false)
  assert.equal(validContent(initialContent),true)
 })
}finally{await server.close()}
