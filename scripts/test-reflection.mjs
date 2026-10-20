import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
const require=createRequire(import.meta.url)
let states=[],cursor=0,effects=[]
const hooks={useState(v){const i=cursor++;if(!(i in states))states[i]=v;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useEffect(fn){effects.push(fn)},useMemo:fn=>fn(),useRef:v=>({current:v})}
let music
async function load(file,name){
 const {outputText}=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
 const exports={}
 vm.runInNewContext(outputText,{URL,crypto:globalThis.crypto,exports,require(id){if(id==='react')return hooks;if(id.endsWith('/music'))return music;if(id.endsWith('/site'))return {defaultSite:{}};if(id.endsWith('locale-ui'))return {L:new Proxy({},{get:(_,tag)=>tag})};if(id.endsWith('.css'))return {};if(id.endsWith('reflection'))return {reflectionExcerpts:()=>[]};if(id==='./ReflectionMusic')return {ReflectionMusic:'music'};return require(id)}})
 return name?exports[name]:exports
}
const nodes=e=>!e||typeof e!=='object'?[]:[e,...[e.props?.children].flat(Infinity).flatMap(nodes)]
function render(C,p={}){cursor=0;effects=[];return nodes(C(p))}
music=await load('src/lib/music.ts')
const {musicEmbed,validMusic,defaultMusic}=music
assert.equal(musicEmbed('<iframe src="https://www.youtube.com/embed/vqwnTNRtQ80?list=RDvqwnTNRtQ80" onload="bad()"></iframe>'),defaultMusic[0].url)
for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/embed/vqwnTNRtQ80','https://evil.test/embed/vqwnTNRtQ80','https://user@www.youtube.com/embed/vqwnTNRtQ80','https://www.youtube.com/embed/short','https://www.youtube.com:444/embed/vqwnTNRtQ80'])assert.equal(musicEmbed(url),null,url)
assert.ok(validMusic([]));assert.ok(validMusic(defaultMusic));assert.ok(!validMusic([...defaultMusic,...defaultMusic]));assert.ok(!validMusic([{...defaultMusic[0],url:'https://evil.test'}]))
const Music=await load('src/components/ReflectionMusic.tsx','ReflectionMusic')
let tree=render(Music)
assert.ok(!tree.some(n=>n.type==='iframe'))
tree.find(n=>n.type==='button').props.onClick()
tree=render(Music)
assert.equal(tree.filter(n=>n.type==='iframe').length,1)
assert.equal(tree.find(n=>n.type==='iframe').props.src,defaultMusic[0].url)
assert.equal(render(Music,{tracks:defaultMusic}).find(n=>n.type==='iframe').props.src,defaultMusic[0].url,'Rerendering with route content preserves the selected player')
tree.find(n=>n.props?.className==='music-dock-minimize').props.onClick()
tree=render(Music)
assert.ok(tree.find(n=>n.type==='aside').props.className.includes('is-minimized'),'Minimize collapses the dock')
assert.equal(tree.filter(n=>n.type==='iframe').length,1,'Minimizing keeps the player mounted so playback continues')
tree.find(n=>n.props?.className==='music-dock-minimize').props.onClick()
tree=render(Music)
assert.ok(!tree.find(n=>n.type==='aside').props.className.includes('is-minimized'),'Expand restores the dock')
tree.find(n=>n.type==='button').props.onClick()
assert.ok(!render(Music).some(n=>n.type==='iframe'),'Closing unmounts the media provider')
const Sky=await load('src/components/SkyReflection.tsx','SkyReflection')
states=[0,false,true,true,false]
tree=render(Sky,{quote:'Passage',source:'Author',writings:[]})
assert.ok(!tree.find(n=>n.type==='section').props.className.includes('is-paused'))
tree.find(n=>n.type==='button').props.onClick()
assert.ok(render(Sky,{quote:'Passage',source:'Author',writings:[]}).find(n=>n.type==='section').props.className.includes('is-paused'))
states=[0,false,false,true,false]
assert.ok(render(Sky,{quote:'Passage',source:'Author',writings:[]}).find(n=>n.type==='section').props.className.includes('is-paused'),'Offscreen motion pauses')
states=[0,false,true,true,true]
assert.ok(render(Sky,{quote:'Passage',source:'Author',writings:[]}).find(n=>n.type==='button').props.disabled,'Reduced motion is respected')
console.log('Reflection: motion states and on-demand player open/minimize/expand/close passed; no external media loaded.')
const Editor=await load('src/components/admin/AdminMusic.tsx','AdminMusic')
states=[];let saved
const props={content:{site:{music:[]}},save:c=>{saved=c;return true},onDirtyChange(){}}
tree=render(Editor,props)
tree.find(n=>n.type==='button'&&n.props.type==='button').props.onClick()
tree=render(Editor,props)
tree.find(n=>n.type==='input').props.onChange({target:{value:'Reading selection'}})
tree=render(Editor,props)
tree.find(n=>n.type==='textarea').props.onChange({target:{value:'https://evil.test/embed/vqwnTNRtQ80'}})
render(Editor,props).find(n=>n.type==='form').props.onSubmit({preventDefault(){}})
assert.equal(saved,undefined,'Invalid providers cannot be saved')
render(Editor,props).find(n=>n.type==='textarea').props.onChange({target:{value:'<iframe src="https://www.youtube.com/embed/vqwnTNRtQ80?autoplay=1"></iframe>'}})
render(Editor,props).find(n=>n.type==='form').props.onSubmit({preventDefault(){}})
assert.equal(saved.site.music[0].url,'https://www.youtube-nocookie.com/embed/vqwnTNRtQ80')
assert.equal(saved.site.music[0].title,'Reading selection')
states=[];props.content=saved
render(Editor,props).find(n=>n.type==='button'&&n.props.type==='button').props.onClick()
render(Editor,props).find(n=>n.type==='form').props.onSubmit({preventDefault(){}})
assert.equal(saved.site.music.length,0,'Removing the last entry persists an empty list')
console.log('Music administration: add, edit, reject unsafe providers, normalize iframe without autoplay, delete and save passed.')
