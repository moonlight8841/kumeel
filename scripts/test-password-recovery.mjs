import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import {createServer} from 'vite'

// Exercise the real form handlers with isolated hooks and a mocked Auth service.
// No account credentials or real recovery emails are used.
const require=createRequire(import.meta.url)
const server=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'})
try{
 const security=await server.ssrLoadModule('/src/lib/auth-security.ts')
 const mfaHelpers=await server.ssrLoadModule('/src/lib/mfa.ts')
 const bookHelpers=await server.ssrLoadModule('/src/books.ts')
 const uploadedBook={url:'https://jigypvbqiuakdatkzoul.supabase.co/storage/v1/object/public/kumeel-books/books/test/book.pdf',bytes:12345}
 assert.equal(security.authCallbackFlow(''),'pkce')
 assert.equal(security.authCallbackFlow('#type=recovery'),'pkce')
 assert.equal(security.authCallbackFlow('#type=signup&access_token=fake&refresh_token=fake'),'pkce')
 assert.equal(security.authCallbackFlow('#type=recovery&access_token=fake&refresh_token=fake'),'implicit')
 const calls=[]
 let oauthError=null
 let factorList=[]
 const auth={
  mfa:{
   listFactors:async()=>({data:{all:factorList,totp:factorList.filter(f=>f.status==='verified')},error:null}),
   unenroll:async({factorId})=>{calls.push(['unenroll',factorId]);return {error:null}},
   enroll:async()=>({data:{id:'new-factor',totp:{qr_code:'invalid-svg',uri:'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test',secret:'TEST-SECRET'}},error:null}),
  },
  signUp:async(...args)=>{calls.push(['signup',...args]);return {data:{session:null},error:null}},
  signInWithOAuth:async(...args)=>{calls.push(['google',...args]);return {error:oauthError}},
  resetPasswordForEmail:async(...args)=>{calls.push(['recovery',...args]);return {error:null}},
  signInWithOtp:async(...args)=>{calls.push(['magic',...args]);return {error:null}},
  getUser:async()=>({data:{user:{id:'test'}},error:null}),
  updateUser:async(...args)=>{calls.push(['update',...args]);return {error:null}},
  signOut:async(...args)=>{calls.push(['signOut',...args]);return {error:null}},
 }
 let states=[],cursor=0
 const react={
  useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},
  useRef(initial){const i=cursor++;return states[i]??(states[i]={current:initial})},
  useEffect(){},
 }
 let fields={},resetCount=0
 const context={
  window:{location:{origin:'https://kumeelalnahab.com'}},
  location:{pathname:'/admin'},history:{replaceState(...args){calls.push(['history',...args])}},
  FormData:class{get(key){return fields[key]??null}},
  crypto:globalThis.crypto,
 }
 async function load(file,name){
  const source=await readFile(file,'utf8')
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
  const exports={}
  vm.runInNewContext(outputText,{...context,exports,require(id){
   if(id==='react')return react
   if(id.endsWith('/cloud'))return {supabase:{auth},uploadBook:async()=>uploadedBook}
   if(id.endsWith('/books'))return bookHelpers
   if(id.endsWith('/mfa'))return mfaHelpers
   if(id.endsWith('/auth-security'))return {...security,captchaConfigured:true,googleConfigured:true}
   if(id.endsWith('/locale-ui'))return {L:new Proxy({},{get:(_,tag)=>tag})}
   if(id==='./AuthCaptcha')return {AuthCaptcha:'captcha'}
   return require(id)
  }})
  return exports[name]
 }
 function nodes(element){if(!element||typeof element!=='object')return [];return [element,...[element.props?.children].flat(Infinity).flatMap(nodes)]}
 function render(Component,props){cursor=0;return nodes(Component(props))}
 const submit=async(tree)=>tree.find(n=>n.type==='form').props.onSubmit({preventDefault(){},currentTarget:{reset(){resetCount++}}})
 const Login=await load('src/components/LoginForm.tsx','LoginForm')
 states=[]
 let adminTree=render(Login,{adminOnly:true})
 assert.equal(adminTree.some(n=>n.type==='button'&&n.props.children==='حساب جديد'),false)
 assert.equal(adminTree.some(n=>n.props.className==='login-google'),false)
 states[0]='signup'
 await submit(render(Login,{adminOnly:true}))
 assert.equal(calls.length,0,'Admin signup is blocked even with forced form state')
 states=[]
 let tree=render(Login)
 tree.find(n=>n.props.className==='login-forgot').props.onClick()
 tree=render(Login)
 assert.equal(tree.find(n=>n.type==='h2').props.children,'استعادة كلمة المرور')
 assert.equal(tree.some(n=>n.props.type==='password'),false)
 tree.find(n=>n.props.name==='email').props.onChange({target:{value:' reader@example.com '}})
 await submit(render(Login));assert.equal(calls.length,0,'CAPTCHA is required')
 tree=render(Login);tree.find(n=>n.type==='captcha').props.onToken('verified-token')
 await submit(render(Login))
 assert.deepEqual(calls[0].slice(0,2),['recovery','reader@example.com'])
 assert.equal(calls[0][2].redirectTo,'https://kumeelalnahab.com/admin?reset=1')
 assert.equal(calls[0][2].captchaToken,'verified-token')
 await submit(render(Login));assert.equal(calls.length,1,'Repeat sends respect cooldown')
 // The separate passwordless tab must continue to send a sign-in link.
 states=[];tree=render(Login)
 tree.find(n=>n.type==='button'&&n.props.children==='رابط عبر البريد').props.onClick()
 tree=render(Login);tree.find(n=>n.type==='captcha').props.onToken('token')
 await submit(render(Login));assert.equal(calls.at(-1)[0],'magic')
 states=[];tree=render(Login)
 await tree.find(n=>n.props.className==='login-google').props.onClick()
 const google=calls.at(-1)
 assert.equal(google[0],'google')
 assert.equal(google[1].provider,'google')
 assert.equal(google[1].options.redirectTo,'https://kumeelalnahab.com/member')
 assert.equal(google[1].options.scopes,'openid email profile')
 oauthError=new Error('provider unavailable')
 await render(Login).find(n=>n.props.className==='login-google').props.onClick()
 assert.equal(render(Login).find(n=>n.props.className==='login-message error').props.role,'alert')
 states=[];tree=render(Login)
 tree.find(n=>n.type==='button'&&n.props.children==='حساب جديد').props.onClick()
 tree=render(Login)
 tree.find(n=>n.type==='captcha').props.onToken('token')
 fields={password:'long unique password',confirm:'long unique password'}
 await submit(render(Login))
 assert.equal(calls.at(-1)[0],'signup')
 assert.equal(calls.at(-1)[1].options.emailRedirectTo,'https://kumeelalnahab.com/member')
 resetCount=0
 const Reset=await load('src/components/PasswordResetForm.tsx','PasswordResetForm')
 states=[];let done=false
 fields={password:'a long unique phrase',confirm:'different phrase'}
 await submit(render(Reset,{onDone(){done=true}}))
 assert.equal(calls.some(c=>c[0]==='update'),false,'Mismatched passwords are rejected')
 fields.confirm=fields.password
 await submit(render(Reset,{onDone(){done=true}}))
 assert.equal(calls.find(c=>c[0]==='update')[1].password,fields.password)
 assert.equal(calls.find(c=>c[0]==='signOut')[1].scope,'local')
 assert.equal(done,true);assert.equal(resetCount,1)
 const Mfa=await load('src/components/AdminMfa.tsx','AdminMfa')
 states=['',true,'','',false,false]
 factorList=[{id:'pending',factor_type:'totp',status:'unverified',friendly_name:'Kumeel administration'}]
 tree=render(Mfa,{onVerified(){}})
 await tree.find(n=>n.type==='button').props.onClick()
 tree=render(Mfa,{onVerified(){}})
 assert.ok(tree.some(n=>n.type==='img'&&n.props.src.startsWith('data:image/png;base64,')))
 const imageSource=tree.find(n=>n.type==='img').props.src
 const png=require('pngjs').PNG.sync.read(Buffer.from(imageSource.split(',')[1],'base64'))
 const decoded=require('jsqr')(new Uint8ClampedArray(png.data),png.width,png.height)
 assert.equal(decoded?.data,'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=Test','Generated PNG decodes to the exact enrollment URI')
 assert.ok(tree.some(n=>n.type==='code'&&n.props.children==='TEST-SECRET'))
 assert.ok(calls.some(c=>c[0]==='unenroll'&&c[1]==='pending'))
 tree.find(n=>n.type==='img').props.onError()
 tree=render(Mfa,{onVerified(){}})
 assert.equal(tree.some(n=>n.type==='img'),false)
 assert.ok(tree.some(n=>n.type==='code'&&n.props.children==='TEST-SECRET'),'Manual secret survives QR image failure')
 factorList=[{id:'verified',factor_type:'totp',status:'verified'}]
 const removals=calls.filter(c=>c[0]==='unenroll').length
 await tree.find(n=>n.type==='button'&&n.props.children==='إعادة إعداد وعرض رمز QR جديد').props.onClick()
 assert.equal(calls.filter(c=>c[0]==='unenroll').length,removals,'Verified factors are never replaced')
 const BookEditor=await load('src/components/BookEditor.tsx','BookEditor')
 states=[];let savedBooks=null
 const bookProps={content:{books:[]},save(next){savedBooks=next;return true}}
 tree=render(BookEditor,bookProps)
 const fileInput={files:[new File(['fixture'],'test.pdf',{type:'application/pdf'})],value:'test.pdf'}
 await tree.find(n=>n.type==='input'&&n.props.type==='file').props.onChange({currentTarget:fileInput})
 assert.equal(fileInput.value,'')
 tree=render(BookEditor,bookProps)
 assert.equal(tree.find(n=>n.props.name==='fileUrl').props.value,uploadedBook.url)
 fields={title:'Test book',subtitle:'A book',author:'Test author',description:'Description',category:'english',focus:'general',pages:'1',language:'en'}
 await submit(tree)
 assert.equal(savedBooks.books[0].fileUrl,uploadedBook.url)
 assert.equal(savedBooks.books[0].bytes,uploadedBook.bytes)
 console.log('Account forms, admin registration isolation, MFA QR decoding and PDF upload-to-draft metadata passed.')
}finally{await server.close()}
