import {useMemo,useState} from 'react'
import {L} from '../lib/locale-ui'
import {SiteHeader} from './SiteHeader'
import {defaultMusic,type MusicTrack} from '../lib/music'
import type {Content} from '../content'
import './music-library.css'

export function MusicPage({content,path,selected,onSelect}:{content:Content;path:string;selected:string|null;onSelect:(id:string)=>void}){
 const tracks=content.site?.music??defaultMusic
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<'all'|'music'|'video'>('all')
 const results=useMemo(()=>tracks.filter(t=>(filter==='all'||(t.kind??'music')===filter)&&t.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),[tracks,query,filter])
 function choose(track:MusicTrack){onSelect(track.id);requestAnimationFrame(()=>document.getElementById('reading-music-player')?.scrollIntoView({behavior:'smooth',block:'center'}))}
 return <><L.a className="skip" href="#music-library">انتقل إلى المحتوى</L.a><SiteHeader current={path}/>
  <L.main id="music-library" className="music-library wrap">
   <L.header className="music-library-intro"><L.span className="section-label">على مهل</L.span><L.h1>الموسيقى والفيديو</L.h1><L.p>مساحة للاستماع والمشاهدة. اختر ما يناسب لحظتك، وابدأ حين ترغب.</L.p><L.div className="music-library-notes"><L.span>تشغيل باختيارك</L.span><L.span>بث مباشر من YouTube</L.span><L.span>يمكنك متابعة التصفح</L.span></L.div></L.header>
   {tracks.length>0?<>
    <L.div className="music-library-toolbar"><L.div className="music-library-filters" role="group" aria-label="تصفية المقاطع">{([['all','الكل'],['music','الموسيقى'],['video','الفيديو']] as const).map(([key,label])=><L.button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</L.button>)}</L.div><L.label className="music-library-search"><L.span>ابحث عن مقطع</L.span><L.input type="search" value={query} maxLength={160} onChange={e=>setQuery(e.target.value)} placeholder="اسم المقطع"/></L.label></L.div>
    <L.div className="music-library-grid">{results.map((t,i)=><L.article key={t.id} className={`music-library-card${selected===t.id?' is-selected':''}`}><L.div className={`music-library-art is-${t.kind??'music'}`} aria-hidden="true"><L.span>{t.kind==='video'?'▷':'♫'}</L.span><L.small>{String(i+1).padStart(2,'0')}</L.small></L.div><L.div className="music-library-card-body"><L.span className="section-label">{t.kind==='video'?'فيديو':'موسيقى'}</L.span><L.h2>{t.title}</L.h2><L.p>YouTube</L.p><L.button type="button" className="text-link" aria-pressed={selected===t.id} onClick={()=>choose(t)}>{selected===t.id?'المقطع المختار ↓':'اختر هذا المقطع ←'}</L.button></L.div></L.article>)}</L.div>
    {!results.length&&<L.p className="music-library-empty" role="status">لا توجد مقاطع تطابق بحثك. جرّب اسمًا آخر أو اختر «الكل».</L.p>}
   </>:<L.p className="music-library-empty">تنتظر هذه المساحة أول مقطع.</L.p>}
  </L.main>
 </>
}
