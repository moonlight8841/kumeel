import {useEffect,useState} from 'react'
import {supabase} from '../../lib/cloud'
import {communityError} from '../../lib/community'
import {PAGE_SIZE,PUBLIC_COLUMNS,initials,languageList,searchFilter,validTeacherId,type TeacherProfile} from '../../lib/teachers'
import {TeacherCard} from './TeacherCard'

const teacherCount=(n:number)=>n===1?'معلم واحد':n===2?'معلمان':n<=10?`${n.toLocaleString('ar-SA')} معلمين`:`${n.toLocaleString('ar-SA')} معلمًا`

function Profile({teacher}:{teacher:TeacherProfile}){
 return <article className="teacher-profile" aria-labelledby="teacher-name">
  <nav className="breadcrumbs" aria-label="مسار الصفحة"><a href="/">الرئيسية</a><span>/</span><a href="/teachers">مجلس التعلّم</a><span>/</span><span>{teacher.name}</span></nav>
  <div className="teacher-profile-grid">
   <aside className="teacher-identity">
    <span className="teacher-avatar is-large" aria-hidden="true">{initials(teacher.name)}</span>
    <h1 id="teacher-name">{teacher.name}</h1>
    <p className="teacher-specialty">{teacher.specialty}</p>
    <dl className="teacher-facts">
     <div><dt>يناسب</dt><dd>{teacher.audience}</dd></div>
     <div><dt>اللغات</dt><dd className="teacher-langs">{languageList(teacher.languages).map(l=><span key={l}>{l}</span>)}</dd></div>
    </dl>
    <p className="teacher-note">اعتماد الصفحة يعني السماح بعرضها، وليس توثيقًا مستقلًا للمؤهلات. الحجز والتواصل المباشر غير متاحين في هذه المرحلة.</p>
   </aside>
   <div className="teacher-content">
    <section><h2>من هو؟</h2><p className="preserve-lines">{teacher.bio}</p></section>
    <section><h2>كيف يعلّم</h2><p className="preserve-lines">{teacher.approach}</p></section>
    <section className="teacher-next"><h2>تعلّم في المنصة الآن</h2><p>إلى أن تُفتح الدروس، يمكنك أن تشارك في لقاءات مجلس الحوار، أو تختبر فهمك في «اكتشف».</p><div className="teacher-actions"><a className="primary" href="/salon">مجلس الحوار ←</a><a className="text-link" href="/explore">اكتشف</a><a className="text-link" href="/teachers">كل المعلمين</a></div></section>
   </div>
  </div>
 </article>
}

export function TeacherDirectory(){
 // undefined until mounted: the server cannot see ?teacher=, so SSR and the first client render match.
 const [teacherId,setTeacherId]=useState<string|null|undefined>(undefined)
 const [profile,setProfile]=useState<TeacherProfile|null>(null)
 const [list,setList]=useState<TeacherProfile[]>([])
 const [page,setPage]=useState(0)
 const [more,setMore]=useState(false)
 const [query,setQuery]=useState('')
 const [term,setTerm]=useState('')
 const [language,setLanguage]=useState('')
 const [loading,setLoading]=useState(true)
 const [message,setMessage]=useState('')
 const single=validTeacherId(teacherId??null)
 useEffect(()=>{setTeacherId(new URLSearchParams(location.search).get('teacher'))},[])

 // Debounce typing so each keystroke does not hit the database.
 useEffect(()=>{const t=setTimeout(()=>{setTerm(query);setPage(0)},350);return()=>clearTimeout(t)},[query])

 useEffect(()=>{
  if(teacherId===undefined||teacherId)return
  let active=true;setLoading(true)
  let request=supabase.from('kumeel_teacher_profiles').select(PUBLIC_COLUMNS).order('published_at',{ascending:false}).order('id').range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE)
  const filter=searchFilter(term)
  if(filter)request=request.or(filter)
  request.then(({data,error})=>{
   if(!active)return
   if(error){setMessage(communityError(error));setLoading(false);return}
   const rows=(data??[]) as TeacherProfile[]
   // One extra row tells us whether another page exists.
   setMore(rows.length>PAGE_SIZE)
   setList(v=>page===0?rows.slice(0,PAGE_SIZE):[...v,...rows.slice(0,PAGE_SIZE)])
   setMessage('');setLoading(false)
  })
  return()=>{active=false}
 },[page,term,teacherId])

 useEffect(()=>{
  if(!teacherId)return
  if(!single){setMessage('رابط المعلم غير صالح.');setLoading(false);return}
  let active=true
  supabase.from('kumeel_teacher_profiles').select(PUBLIC_COLUMNS).eq('id',teacherId).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setMessage(communityError(error));else if(data){setProfile(data as TeacherProfile);document.title=`${(data as TeacherProfile).name} | مجلس التعلّم`}else setMessage('صفحة المعلم غير متاحة حاليًا.');setLoading(false)})
  return()=>{active=false}
 },[teacherId,single])

 if(teacherId)return <section className="wrap section teachers">{profile?<Profile teacher={profile}/>:<div className="teachers-state" role="status"><p>{loading?'جارٍ تحميل صفحة المعلم…':message}</p><a className="text-link" href="/teachers">العودة إلى مجلس التعلّم ←</a></div>}</section>

 const languages=[...new Set(list.flatMap(t=>languageList(t.languages)))].sort((a,b)=>a.localeCompare(b,'ar'))
 const shown=language?list.filter(t=>languageList(t.languages).includes(language)):list
 return <section className="wrap section teachers" aria-labelledby="teachers-title">
  <header className="teachers-hero">
   <div>
    <span className="section-label">مجلس التعلّم</span>
    <h1 id="teachers-title">اكتشف من يساعدك على الفهم.</h1>
    <p>معلمون يعرّفون بتخصصاتهم وطرق تعليمهم. كل صفحة تراجعها الإدارة قبل نشرها؛ الاعتماد إذنٌ بالعرض، وليس توثيقًا مستقلًا للمؤهلات.</p>
   </div>
   <aside className="teachers-join"><h2>هل تعلّم؟</h2><p>قدّم صفحتك التعريفية من مساحة العضو، وستظهر هنا بعد المراجعة.</p><a className="primary" href="/member#teacher-application">قدّم طلب التدريس ←</a></aside>
  </header>

  <div className="teachers-toolbar" role="search">
   <label className="teachers-search"><span className="sr-only">ابحث عن معلم</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو التخصص أو اللغة…" maxLength={60}/></label>
   {languages.length>1&&<div className="tabs" aria-label="تصفية حسب اللغة"><button aria-pressed={!language} onClick={()=>setLanguage('')}>كل اللغات</button>{languages.map(l=><button key={l} aria-pressed={language===l} onClick={()=>setLanguage(l)}>{l}</button>)}</div>}
  </div>

  <p className="teachers-count" role="status">{loading&&!list.length?'جارٍ تحميل المعلمين…':message||(shown.length?`${teacherCount(shown.length)}${term?` لـ«${term}»`:''}`:'')}</p>

  {!loading&&!message&&!shown.length&&<div className="teachers-empty">{term||language?<><h2>لا نتائج مطابقة.</h2><p>جرّب كلمة أخرى، أو أزل تصفية اللغة.</p><button className="text-link" onClick={()=>{setQuery('');setLanguage('')}}>امسح البحث</button></>:<><h2>نستقبل أولى طلبات المعلمين.</h2><p>تظهر الصفحات هنا بعد مراجعة الإدارة. الدروس والحجوزات في مرحلة لاحقة.</p><a className="primary" href="/member#teacher-application">كن أول المعلمين ←</a></>}</div>}

  <div className="teachers-grid">{shown.map(t=><TeacherCard key={t.id} teacher={t}/>)}</div>
  {more&&<div className="teachers-more"><button className="text-link" disabled={loading} onClick={()=>setPage(p=>p+1)}>{loading?'جارٍ التحميل…':'عرض المزيد'}</button></div>}
 </section>
}
