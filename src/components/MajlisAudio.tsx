// Members-only audio majlis (Stream Video, "majlis" call type). Loaded on demand after a member joins.
// The host (site owner) opens and closes the room; members listen, raise a hand and speak once allowed.
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {StreamVideoClient,CallingState,OwnCapability,hasAudio,type Call,type StreamVideoParticipant} from '@stream-io/video-client'
import {StreamVideoProvider,StreamCallProvider,useCallStateHooks} from '@stream-io/video-react-bindings'
import {L,useLocale} from '../lib/locale-ui'
import type {MajlisSession} from '../lib/majlis-chat'

type Request={id:string;name:string}
const initial=(name?:string)=>([...(name?.trim()||'؟')][0]??'؟').toLocaleUpperCase()

function ParticipantAudio({call,participant}:{call:Call;participant:StreamVideoParticipant}){
 const ref=useRef<HTMLAudioElement>(null)
 useEffect(()=>{if(ref.current)return call.bindAudioElement(ref.current,participant.sessionId)},[call,participant.sessionId])
 return <audio ref={ref} autoPlay/>
}

function Room({call,host,onReset}:{call:Call;host:boolean;onReset:()=>void}){
 const {useIsCallLive,useCallCallingState,useParticipants,useHasPermissions,useMicrophoneState,useCallSession}=useCallStateHooks()
 const live=useIsCallLive(),state=useCallCallingState(),participants=useParticipants(),session=useCallSession()
 const canSpeak=useHasPermissions(OwnCapability.SEND_AUDIO),{isMute}=useMicrophoneState()
 const joined=state===CallingState.JOINED,english=useLocale()==='en'
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[asked,setAsked]=useState(false),[requests,setRequests]=useState<Request[]>([])
 const run=useCallback(async(action:()=>Promise<unknown>,message:string)=>{setBusy(true);setError('');try{await action()}catch{setError(message)}finally{setBusy(false)}},[])
 // Hosts collect raised hands; members return to the waiting state when the host ends the session.
 useEffect(()=>host?call.on('call.permission_request',e=>{if(e.permissions.includes(OwnCapability.SEND_AUDIO))setRequests(r=>r.some(x=>x.id===e.user.id)?r:[...r,{id:e.user.id,name:e.user.name||'عضو'}])}):undefined,[call,host])
 useEffect(()=>{if(!host&&joined&&!live){void call.leave().catch(()=>undefined).finally(onReset)}},[host,joined,live,call,onReset])
 useEffect(()=>{if(canSpeak)setAsked(false)},[canSpeak])
 const others=participants.filter(p=>!p.isLocalParticipant)
 // Anyone publishing audio holds the floor; the host can take it back.
 const speakers=participants.filter(p=>hasAudio(p))
 const count=joined?participants.length:(session?.participants.length??0)
 async function start(){await call.join({create:false});await call.goLive();await call.microphone.enable()}
 async function end(){
  await Promise.allSettled(others.map(p=>call.revokePermissions(p.userId,[OwnCapability.SEND_AUDIO])))
  await call.stopLive();setRequests([]);await call.leave();onReset()
 }
 async function grant(r:Request){await call.grantPermissions(r.id,[OwnCapability.SEND_AUDIO]);setRequests(x=>x.filter(y=>y.id!==r.id))}
 return <L.div className="majlis-audio">
  <L.div className="majlis-audio-head">
   <L.span className={`majlis-live${live?' is-live':''}`}>{live?'مباشر الآن':'المجلس الصوتي مغلق'}</L.span>
   {live&&<L.span className="majlis-count">{count.toLocaleString(english?'en':'ar-SA')} <L.span>في المجلس</L.span></L.span>}
  </L.div>
  {!live&&!host&&<L.p className="majlis-status">بانتظار المضيف. سيظهر زر الاستماع هنا حين يبدأ اللقاء.</L.p>}
  {joined&&<L.ul className="majlis-speakers" aria-label="المشاركون">{participants.map(p=><L.li key={p.sessionId} className={p.isSpeaking?'is-speaking':''}><L.span className="majlis-face" aria-hidden="true">{initial(p.name)}</L.span><L.span>{p.name||'عضو'}{p.isLocalParticipant?' (أنت)':''}</L.span>{host&&!p.isLocalParticipant&&speakers.includes(p)&&<L.button type="button" onClick={()=>void run(()=>call.revokePermissions(p.userId,[OwnCapability.SEND_AUDIO]),'تعذّر سحب الكلمة.')}>سحب الكلمة</L.button>}</L.li>)}</L.ul>}
  <L.div className="majlis-audio-actions">
   {host&&!live&&<L.button className="majlis-button" type="button" disabled={busy} onClick={()=>void run(start,'تعذّر بدء اللقاء. تأكّد من السماح بالمايكروفون.')}>ابدأ اللقاء</L.button>}
   {host&&live&&!joined&&<L.button className="majlis-button" type="button" disabled={busy} onClick={()=>void run(async()=>{await call.join({create:false});await call.microphone.enable()},'تعذّر الانضمام.')}>عُد إلى اللقاء</L.button>}
   {!host&&live&&!joined&&<L.button className="majlis-button" type="button" disabled={busy} onClick={()=>void run(()=>call.join({create:false}),'تعذّر الانضمام إلى اللقاء.')}>استمع الآن</L.button>}
   {joined&&canSpeak&&<L.button type="button" aria-pressed={!isMute} onClick={()=>void run(()=>call.microphone.toggle(),'تعذّر تشغيل المايكروفون. تأكّد من السماح به في المتصفح.')}>{isMute?'افتح المايك':'اكتم المايك'}</L.button>}
   {joined&&!host&&!canSpeak&&<L.button type="button" disabled={asked||busy} onClick={()=>void run(async()=>{await call.requestPermissions({permissions:[OwnCapability.SEND_AUDIO]});setAsked(true)},'تعذّر إرسال الطلب.')}>{asked?'طلبك بانتظار إذن المضيف':'✋ ارفع يدك للكلام'}</L.button>}
   {joined&&!host&&<L.button type="button" onClick={()=>void call.leave().catch(()=>undefined).finally(onReset)}>مغادرة</L.button>}
   {host&&joined&&<L.button type="button" className="majlis-end" disabled={busy} onClick={()=>void run(end,'تعذّر إنهاء اللقاء.')}>أنهِ اللقاء</L.button>}
  </L.div>
  {host&&requests.length>0&&<L.div className="majlis-requests" role="status"><L.h4>أيادٍ مرفوعة</L.h4><L.ul>{requests.map(r=><L.li key={r.id}><L.span>{r.name}</L.span><L.button type="button" onClick={()=>void run(()=>grant(r),'تعذّر منح الكلمة.')}>اسمح بالكلام</L.button><L.button type="button" onClick={()=>setRequests(x=>x.filter(y=>y.id!==r.id))}>تجاهل</L.button></L.li>)}</L.ul></L.div>}
  {error&&<L.p className="majlis-error" role="alert">{error}</L.p>}
  {joined&&others.map(p=><ParticipantAudio key={p.sessionId} call={call} participant={p}/>)}
 </L.div>
}

export default function MajlisAudio({session,refresh}:{session:MajlisSession;refresh:()=>Promise<string>}){
 const client=useMemo(()=>{
  let first:string|null=session.token
  return new StreamVideoClient({apiKey:session.apiKey,user:{id:session.userId},tokenProvider:async()=>{if(first){const t=first;first=null;return t}return refresh()}})
 },[session.apiKey,session.userId,session.token,refresh])
 const [call,setCall]=useState<Call|null>(null),[failed,setFailed]=useState(false)
 // A left call cannot be rejoined, so leaving swaps in a fresh instance that watches the room again.
 const load=useCallback(()=>{const next=client.call(session.call.type,session.call.id);setCall(next);next.get().then(()=>setFailed(false),()=>setFailed(true))},[client,session.call.type,session.call.id])
 useEffect(()=>{load();return()=>{void client.disconnectUser()}},[client,load])
 if(failed)return <L.p className="majlis-error" role="alert">تعذّر تحميل المجلس الصوتي. حدّث الصفحة وأعد المحاولة.</L.p>
 if(!call)return null
 return <StreamVideoProvider client={client}><StreamCallProvider call={call}><Room call={call} host={session.call.host} onReset={load}/></StreamCallProvider></StreamVideoProvider>
}
