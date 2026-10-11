import type {Content} from '../content'
import {defaultSite} from '../site'
export function Newsletter({content}:{content:Content}){
 const url=(content.site??defaultSite).newsletterUrl
 return <section className="newsletter wrap" aria-labelledby="newsletter-title"><div><span className="section-label">رسالة حين تستحق الفكرة</span><h2 id="newsletter-title">قراءة جديدة. أو موعد لسؤال.</h2><p>إشعارات المقالات الجديدة ومواعيد مجلس الحوار عبر البريد.</p></div><div>{url?<><a className="primary" href={url} target="_blank" rel="noopener noreferrer">اشترك بالبريد الإلكتروني ↗</a><p className="sample-note">أكمل نموذج الاشتراك وتأكيد بريدك لدى خدمة النشرة. يمكنك إلغاء الاشتراك من رسائلها.</p></>:<p className="newsletter-pending">النشرة البريدية قيد الإعداد. سيظهر رابط التسجيل هنا عند تفعيلها.</p>}</div></section>
}
