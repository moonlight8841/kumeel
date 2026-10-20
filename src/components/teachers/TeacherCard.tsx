import {L} from '../../lib/locale-ui'
import {excerpt,initials,languageList,type TeacherProfile} from '../../lib/teachers'

type CardData=Pick<TeacherProfile,'name'|'specialty'|'bio'|'audience'|'languages'>&{id?:string}

// Shared by the directory, the application preview and the admin review.
export function TeacherCard({teacher,preview=false}:{teacher:CardData;preview?:boolean}){
 const title=teacher.name.trim()||'اسمك هنا'
 return <L.article className={`teacher-card${preview?' is-preview':''}`}>
  <L.div className="teacher-card-head">
   <L.span className="teacher-avatar" aria-hidden="true">{initials(title)}</L.span>
   <L.div><L.h2>{teacher.id&&!preview?<L.a href={`/teachers?teacher=${teacher.id}`}>{title}</L.a>:title}</L.h2><L.p className="teacher-specialty">{teacher.specialty.trim()||'التخصص'}</L.p></L.div>
  </L.div>
  <L.p className="teacher-bio">{excerpt(teacher.bio,170)||'نبذتك التعريفية تظهر هنا.'}</L.p>
  <L.dl className="teacher-facts">
   {teacher.audience.trim()&&<L.div><L.dt>يناسب</L.dt><L.dd>{teacher.audience}</L.dd></L.div>}
   <L.div><L.dt>اللغات</L.dt><L.dd className="teacher-langs">{languageList(teacher.languages).map(l=><L.span key={l}>{l}</L.span>)}</L.dd></L.div>
  </L.dl>
  {teacher.id&&!preview&&<L.a className="text-link" href={`/teachers?teacher=${teacher.id}`} aria-label={`صفحة ${title}`}>الصفحة الكاملة ←</L.a>}
 </L.article>
}
