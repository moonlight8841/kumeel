import {excerpt,initials,languageList,type TeacherProfile} from '../../lib/teachers'

type CardData=Pick<TeacherProfile,'name'|'specialty'|'bio'|'audience'|'languages'>&{id?:string}

// Shared by the directory, the application preview and the admin review.
export function TeacherCard({teacher,preview=false}:{teacher:CardData;preview?:boolean}){
 const title=teacher.name.trim()||'اسمك هنا'
 return <article className={`teacher-card${preview?' is-preview':''}`}>
  <div className="teacher-card-head">
   <span className="teacher-avatar" aria-hidden="true">{initials(title)}</span>
   <div><h2>{teacher.id&&!preview?<a href={`/teachers?teacher=${teacher.id}`}>{title}</a>:title}</h2><p className="teacher-specialty">{teacher.specialty.trim()||'التخصص'}</p></div>
  </div>
  <p className="teacher-bio">{excerpt(teacher.bio,170)||'نبذتك التعريفية تظهر هنا.'}</p>
  <dl className="teacher-facts">
   {teacher.audience.trim()&&<div><dt>يناسب</dt><dd>{teacher.audience}</dd></div>}
   <div><dt>اللغات</dt><dd className="teacher-langs">{languageList(teacher.languages).map(l=><span key={l}>{l}</span>)}</dd></div>
  </dl>
  {teacher.id&&!preview&&<a className="text-link" href={`/teachers?teacher=${teacher.id}`} aria-label={`صفحة ${title}`}>الصفحة الكاملة ←</a>}
 </article>
}
