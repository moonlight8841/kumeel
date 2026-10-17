import {browserSession,trustedBrowserRequest,publicUser} from './browser-session.mjs'
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})
export async function handleAuth(request,options){
 if(!trustedBrowserRequest(request))return reply({data:null,error:{code:'request_rejected',status:403}},403)
 if(request.method!=='POST')return reply({data:null,error:{code:'method_not_allowed',status:405}},405)
 const context=browserSession(request,options)
 try{
  const text=await boundedText(request,12000),body=JSON.parse(text)
  const {action,args={}}=body
  if(!body||typeof body!=='object'||!args||typeof args!=='object')return reply({data:null,error:{code:'invalid_request',status:400}},400)
  if(['signInWithPassword','signUp'].includes(action)&&(typeof args.password!=='string'||args.password.length>512))return reply({data:null,error:{code:'invalid_request',status:400}},400)
  if(['unenroll','challengeAndVerify'].includes(action)&&!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.factorId??'')))return reply({data:null,error:{code:'invalid_request',status:400}},400)
  if(action==='challengeAndVerify'&&!/^\d{6}$/.test(args.code??''))return reply({data:null,error:{code:'invalid_request',status:400}},400)
  const auth=context.client.auth
  let result,session=null,event=null
  const identityActions=['updateUser','signOut','listFactors','enroll','unenroll','challengeAndVerify','assurance']
  if(identityActions.includes(action)){session=await context.verified();if(!session)return context.apply(reply({data:null,error:{code:'session_not_found',status:401}},401))}
  const email=typeof args.email==='string'?args.email.trim():''
  const captchaToken=typeof args.options?.captchaToken==='string'?args.options.captchaToken:undefined
  const origin=new URL(request.url).origin
  const redirect=`${origin}/admin`
  switch(action){
   case 'session':session=await context.verified();result={data:{session:session?{user:publicUser(session.user)}:null,user:publicUser(session?.user)},error:null};break
   case 'signInWithPassword':result=await auth.signInWithPassword({email,password:args.password,options:{captchaToken}});event='SIGNED_IN';break
   case 'signUp':result=await auth.signUp({email,password:args.password,options:{captchaToken,emailRedirectTo:redirect}});event='SIGNED_IN';break
   case 'signInWithOtp':result=await auth.signInWithOtp({email,options:{captchaToken,shouldCreateUser:false,emailRedirectTo:redirect}});break
   case 'resetPasswordForEmail':result=await auth.resetPasswordForEmail(email,{captchaToken,redirectTo:redirect+'?reset=1'});break
   case 'exchange':if(typeof args.code!=='string'||args.code.length>2048)throw Error('Invalid code');result=await auth.exchangeCodeForSession(args.code);event=new URL(request.url).searchParams.get('reset')==='1'?'PASSWORD_RECOVERY':'SIGNED_IN';break
   case 'signOut':result=await auth.signOut({scope:args.scope==='global'?'global':'local'});if(!result.error){context.clear();event='SIGNED_OUT'}break
   case 'updateUser':if(typeof args.password!=='string'||[...args.password].length<14||[...args.password].length>128)throw Error('Invalid password');result=await auth.updateUser({password:args.password});event='USER_UPDATED';break
   case 'listFactors':result=await auth.mfa.listFactors();break
   case 'enroll':result=await auth.mfa.enroll({factorType:'totp',friendlyName:'Kumeel administration',issuer:'Kumeel Al Nahab'});break
   case 'unenroll':result=await auth.mfa.unenroll({factorId:args.factorId});break
   case 'challengeAndVerify':result=await auth.mfa.challengeAndVerify({factorId:args.factorId,code:args.code});event='MFA_CHALLENGE_VERIFIED';break
   case 'assurance':result=await auth.mfa.getAuthenticatorAssuranceLevel(session.access_token);break
   default:return context.apply(reply({data:null,error:{code:'invalid_action',status:400}},400))
  }
  if(result.error){const status=result.error.status>=400&&result.error.status<=599?result.error.status:400;return context.apply(reply({data:null,error:{code:result.error.code||'auth_failed',status,message:'Authentication request failed.'}},status))}
  let data=result.data??{}
  // Never serialize SDK session objects or MFA verification tokens to the browser.
  if(['signInWithPassword','signUp','exchange','challengeAndVerify','updateUser'].includes(action)){
   const user=result.data?.user??(await auth.getUser()).data.user
   const hasSession=Boolean(result.data?.session||result.data?.access_token||session)
   data={user:publicUser(user),session:hasSession?{user:publicUser(user)}:null}
  }
  return context.apply(reply({data,error:null,event}))
 }catch(error){const tooLarge=error?.message==='Body too large';return context.apply(reply({data:null,error:{code:tooLarge?'body_too_large':'auth_unavailable',status:tooLarge?413:503,message:'Authentication unavailable.'}},tooLarge?413:503))}
}
export async function boundedText(request,max){
 const reader=request.body?.getReader();if(!reader)return ''
 const chunks=[];let length=0
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw Error('Body too large')}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return new TextDecoder().decode(bytes)
}
