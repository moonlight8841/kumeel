import {L} from '../lib/locale-ui'
import type {Content} from '../content'
import {defaultSite} from '../site'
export function Newsletter({content}:{content:Content}){
 const url=(content.site??defaultSite).newsletterUrl
 return <L.section className="newsletter wrap" aria-labelledby="newsletter-title"><L.div><L.span className="section-label">رسالة حين تستحق الفكرة</L.span><L.h2 id="newsletter-title">قراءة جديدة. أو موعد لسؤال.</L.h2><L.p>إشعارات المقالات الجديدة ومواعيد مجلس الحوار عبر البريد.</L.p></L.div><L.div>{url?<><L.a className="primary" href={url} target="_blank" rel="noopener noreferrer">اشترك بالبريد الإلكتروني ↗</L.a><L.p className="sample-note">أكمل نموذج الاشتراك وتأكيد بريدك لدى خدمة النشرة. يمكنك إلغاء الاشتراك من رسائلها.</L.p></>:<L.p className="newsletter-pending">النشرة البريدية قيد الإعداد. سيظهر رابط التسجيل هنا عند تفعيلها.</L.p>}</L.div></L.section>
}
