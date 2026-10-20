import {useEffect,useState} from 'react'
import type {Content} from '../../content'
import {defaultSite} from '../../site'
import {defaultMusic,musicEmbed,validMusic,type MusicTrack} from '../../lib/music'

type Props={content:Content;save:(content:Content)=>boolean;onDirtyChange:(dirty:boolean)=>void}
export function AdminMusic({content,save,onDirtyChange}:Props){
 const initial=content.site?.music??defaultMusic
 const [tracks,setTracks]=useState<MusicTrack[]>(initial)
 const [error,setError]=useState('')
 const dirty=JSON.stringify(tracks)!==JSON.stringify(initial)
 useEffect(()=>{onDirtyChange(dirty)},[dirty,onDirtyChange])
 useEffect(()=>()=>onDirtyChange(false),[onDirtyChange])
 function update(id:string,patch:Partial<MusicTrack>){setTracks(v=>v.map(t=>t.id===id?{...t,...patch}:t));setError('')}
 function move(index:number,delta:number){setTracks(v=>{const next=[...v],target=index+delta;if(target<0||target>=next.length)return v;[next[index],next[target]]=[next[target],next[index]];return next})}
 function submit(){
  if(!validMusic(tracks)){setError('أدخل عنوانًا ورابط YouTube صالحًا لكل مقطع. الحد الأقصى 12 مقطعًا.');return}
  const music=tracks.map(t=>({...t,title:t.title.trim(),url:musicEmbed(t.url)!}))
  if(save({...content,site:{...(content.site??defaultSite),music}}))setError('')
 }
 return <form className="admin-form" onSubmit={e=>{e.preventDefault();submit()}}>
  <p>روابط خارجية فقط؛ لا نرفع ملفات الصوت أو الفيديو. يُحمّل المشغّل عند طلب الزائر ويستمر أثناء التنقل الداخلي. حذف جميع المقاطع يخفي المشغّل.</p>
  <p className="admin-muted">تأكد من سماح صاحب المحتوى بالتضمين. عنوان «Copyright Free» وحده لا يثبت ترخيص إعادة الاستخدام. لا يُنفّذ HTML المدخل؛ نستخرج رابط YouTube فقط.</p>
  {tracks.map((t,i)=><fieldset className="admin-card" key={t.id}><legend>المقطع {i+1}</legend>
   <label className="admin-field">العنوان<input value={t.title} maxLength={160} required onChange={e=>update(t.id,{title:e.target.value})}/></label>
   <label className="admin-field">التصنيف<select value={t.kind??'music'} onChange={e=>update(t.id,{kind:e.target.value as 'music'|'video'})}><option value="music">موسيقى</option><option value="video">فيديو</option></select></label>
   <label className="admin-field">الرابط أو كود iframe<textarea dir="ltr" value={t.url} maxLength={2000} required rows={3} onChange={e=>update(t.id,{url:e.target.value})}/></label>
   {t.url&&!musicEmbed(t.url)&&<p className="admin-error">الرابط غير مدعوم. استخدم YouTube أو youtube-nocookie أو youtu.be.</p>}
   <button type="button" className="admin-btn" onClick={()=>setTracks(v=>v.filter(x=>x.id!==t.id))}>حذف المقطع</button>
   <button type="button" className="admin-btn" disabled={i===0} onClick={()=>move(i,-1)}>نقل للأعلى ↑</button><button type="button" className="admin-btn" disabled={i===tracks.length-1} onClick={()=>move(i,1)}>نقل للأسفل ↓</button>
  </fieldset>)}
  <button type="button" className="admin-btn" disabled={tracks.length>=12} onClick={()=>setTracks(v=>[...v,{id:crypto.randomUUID(),title:'',url:''}])}>إضافة مقطع</button>
  <div className="admin-savebar"><span role="status">{error||'احفظ المسودة ثم انشرها من «النشر والحساب».'}</span><button className="admin-btn is-primary" disabled={!dirty}>حفظ المشغّل</button></div>
 </form>
}
