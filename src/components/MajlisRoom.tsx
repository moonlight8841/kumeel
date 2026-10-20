// Loaded on demand only after a member joins, so visitors never download the chat bundle.
import {useMemo} from 'react'
import {Chat,Channel,Window,MessageList,MessageComposer,Thread,useCreateChatClient,Streami18n} from 'stream-chat-react'
import 'stream-chat-react/dist/css/index.css'
import {arabicChat,type MajlisSession} from '../lib/majlis-chat'

export default function MajlisRoom({session,refresh,english}:{session:MajlisSession;refresh:()=>Promise<string>;english:boolean}){
 // The first connection uses the token we already have; reconnects ask the server for a fresh one.
 const tokenOrProvider=useMemo(()=>{let first:string|null=session.token;return async()=>{if(first){const t=first;first=null;return t}return refresh()}},[session.token,refresh])
 const userData=useMemo(()=>({id:session.userId}),[session.userId])
 const client=useCreateChatClient({apiKey:session.apiKey,tokenOrProvider,userData})
 const i18n=useMemo(()=>english?new Streami18n({language:'en'}):new Streami18n({language:'ar',translationsForLanguage:arabicChat}),[english])
 const channel=useMemo(()=>client?.channel(session.channel.type,session.channel.id),[client,session.channel.type,session.channel.id])
 if(!client||!channel)return <p className="majlis-status" role="status">{english?'Connecting…':'جارٍ الاتصال بالمجلس…'}</p>
 return <div className="majlis-room" dir={english?'ltr':'rtl'}>
  <Chat client={client} i18nInstance={i18n} theme="str-chat__theme-light">
   <Channel channel={channel}>
    <Window><MessageList/><MessageComposer focus={false}/></Window>
    <Thread/>
   </Channel>
  </Chat>
 </div>
}
