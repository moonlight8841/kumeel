import {useState} from 'react'
import {L} from '../lib/locale-ui'
import {defaultMusic,musicEmbed,type MusicTrack} from '../lib/music'
import './reflection-music.css'

export function ReflectionMusic({tracks=defaultMusic,onOpenChange,selected,onSelect,inline=true}:{tracks?:MusicTrack[];onOpenChange?:(open:boolean)=>void;selected?:string|null;onSelect?:(id:string|null)=>void;inline?:boolean}){
 const [localSelected,setSelected]=useState<string|null>(null)
 // Minimizing is tied to the current track, so choosing another track expands the player again.
 const [minimizedId,setMinimizedId]=useState<string|null>(null)
 const current=tracks.find(t=>t.id===(selected===undefined?localSelected:selected))
 const src=current&&musicEmbed(current.url)
 const minimized=Boolean(src)&&minimizedId===current?.id
 function choose(id:string|null){setSelected(id);onSelect?.(id);onOpenChange?.(id!==null)}
 if(!tracks.length||(!inline&&!src))return null
 return <L.aside className={`music-dock${src?' is-open':''}${inline?' is-inline':''}${minimized?' is-minimized':''}`} aria-label="الموسيقى والفيديو">
  <L.div className="music-dock-heading"><L.div><L.h2>الموسيقى والفيديو</L.h2><L.p>{src?current.title:'مشغّل YouTube اختياري · يُحمّل عند الطلب.'}{minimized&&<>{' · '}<L.span className="music-dock-live">يعمل في الخلفية</L.span></>}</L.p></L.div><L.div className="music-dock-actions"><L.button type="button" className="music-dock-toggle" aria-expanded={Boolean(src)} aria-controls="reading-music-player" aria-label={src?(minimized?'إغلاق وإيقاف الصوت':undefined):undefined} onClick={()=>choose(src?null:tracks[0].id)}>{src?(minimized?'✕':'إغلاق المشغّل وإيقاف الصوت'):'فتح المشغّل'}</L.button>{src&&<L.button type="button" className="music-dock-minimize" aria-expanded={!minimized} aria-controls="reading-music-player" aria-label={minimized?'توسيع المشغّل':'تصغير المشغّل مع استمرار التشغيل'} onClick={()=>setMinimizedId(minimized?null:current.id)}>{minimized?'توسيع':'تصغير'}</L.button>}</L.div></L.div>
  <div id="reading-music-player">{src&&<>
   {tracks.length>1&&<L.label>اختر مقطعًا<L.select value={current.id} onChange={e=>choose(e.target.value)}>{tracks.map(t=><L.option key={t.id} value={t.id}>{t.title}</L.option>)}</L.select></L.label>}
   <iframe key={src} src={src} title={current.title} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
   <L.p>اضغط التشغيل داخل الفيديو. يستمر أثناء التنقل الداخلي؛ تحديث الصفحة يوقفه.</L.p>
   <L.a href={src.replace('www.youtube-nocookie.com/embed/','www.youtube.com/watch?v=').replace('?list=','&list=')} target="_blank" rel="noopener noreferrer">فتح في YouTube ↗</L.a>
   {!inline&&<L.a className="music-return" href="/music">العودة إلى الموسيقى والفيديو ←</L.a>}
  </>}{!src&&inline&&<L.div className="music-player-placeholder"><L.span aria-hidden="true">▷</L.span><L.p>اختر مقطعًا من المكتبة، ثم اضغط التشغيل داخل الفيديو.</L.p></L.div>}</div>
 </L.aside>
}
