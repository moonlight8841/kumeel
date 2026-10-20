import assert from 'node:assert/strict'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'})
try{
 const {validateBookPdf,MAX_BOOK_BYTES}=await server.ssrLoadModule('/src/lib/book-upload.ts')
 const {uploadBook,supabase}=await server.ssrLoadModule('/src/lib/cloud.ts')
 const {validBookUrl}=await server.ssrLoadModule('/src/books.ts')
 const pdf=new File(['%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n'],'test.pdf',{type:'application/pdf'})
 await validateBookPdf(pdf)
 await assert.rejects(()=>validateBookPdf(new File(['<html>not a PDF</html>'],'fake.pdf',{type:'application/pdf'})))
 await assert.rejects(()=>validateBookPdf(new File(['%PDF-1.7\ntruncated'],'test.pdf',{type:'application/pdf'})))
 await assert.rejects(()=>validateBookPdf(new File(['%PDF-1.7\n%%EOF'],'test.html',{type:'application/pdf'})))
 await assert.rejects(()=>validateBookPdf({name:'large.pdf',type:'application/pdf',size:MAX_BOOK_BYTES+1}))
 let confirmed=true,level='aal2',storageError=null
 const calls=[]
 supabase.auth.getUser=async()=>({data:{user:{id:'00000000-0000-0000-0000-000000000001',email_confirmed_at:confirmed?'2026-01-01':null}},error:null})
 supabase.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:level},error:null})
 supabase.storage.from=bucket=>({upload:async(path,file,options)=>{calls.push({bucket,path,file,options});return {error:storageError}},getPublicUrl:path=>({data:{publicUrl:'https://jigypvbqiuakdatkzoul.supabase.co/storage/v1/object/public/kumeel-books/'+path}})})
 level='aal1';await assert.rejects(()=>uploadBook(pdf));assert.equal(calls.length,0)
 level='aal2';confirmed=false;await assert.rejects(()=>uploadBook(pdf));assert.equal(calls.length,0)
 confirmed=true;await assert.rejects(()=>uploadBook(new File(['fake'],'fake.pdf',{type:'application/pdf'})));assert.equal(calls.length,0)
 const result=await uploadBook(pdf)
 assert.equal(result.bytes,pdf.size);assert.equal(validBookUrl(result.url),true)
 assert.equal(calls[0].bucket,'kumeel-books');assert.match(calls[0].path,/^books\/00000000-0000-0000-0000-000000000001\/[a-f0-9-]+\.pdf$/)
 assert.equal(calls[0].options.upsert,false);assert.equal(calls[0].options.contentType,'application/pdf');assert.equal(calls[0].file,pdf)
 storageError={message:'private provider error'}
 await assert.rejects(()=>uploadBook(pdf),error=>!error.message.includes('private provider error'))
 console.log('PDF uploads: format/size checks, confirmed email, MFA, immutable per-user paths, URL/size metadata and redacted failures passed; no remote upload made.')
}finally{await server.close()}
