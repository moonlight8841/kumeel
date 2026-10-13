import {useState} from 'react'
import type {Content} from '../../content'

type ListKey='writings'|'ideas'|'media'|'sessions'
const lists:[ListKey,string,string][]=[['writings','الكتابات','✎'],['ideas','الأفكار','◇'],['media','الوسائط','▣'],['sessions','اللقاءات','◷']]

export function AdminArrange({content,save}:{content:Content;save:(next:Content)=>boolean}){
 const [undo,setUndo]=useState<{content:Content;title:string}|null>(null)
 const [pending,setPending]=useState<string|null>(null)
 function reorder(key:ListKey,index:number,delta:number){const list=[...(content[key]??[])];const target=index+delta;if(target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];save({...content,[key]:list})}
 function remove(key:ListKey,id:string,title:string){const before=content;if(save({...content,[key]:(content[key]??[]).filter(i=>i.id!==id)})){setUndo({content:before,title});setPending(null)}}
 return <div className="admin-arrange">
  <p className="admin-muted">الترتيب هنا هو ترتيب العرض للزوار. إزالة العنصر تزيل صفحته من النسخة التالية عند النشر؛ احتفظ بنسخة احتياطية قبل الإزالات الكبيرة.</p>
  {undo&&<div className="admin-inline-notice" role="status"><span>أُزيل «{undo.title}» من المسودة.</span><button className="admin-btn" onClick={()=>{if(save(undo.content))setUndo(null)}}>تراجع عن الإزالة</button></div>}
  {lists.map(([key,label,icon])=>{const items=content[key]??[];return <section key={key} className="admin-card" aria-labelledby={`arrange-${key}`}>
   <div className="admin-card-head"><h2 id={`arrange-${key}`}><span aria-hidden="true">{icon}</span> {label}</h2><span className="admin-chip">{items.length.toLocaleString('ar-SA')}</span></div>
   {items.length?<ol className="admin-order">{items.map((item,index)=>{const id=`${key}:${item.id}`;return <li key={item.id}>
    <span className="admin-order-index">{(index+1).toLocaleString('ar-SA')}</span>
    <span className="admin-order-label">{item.title}</span>
    <span className="admin-order-actions">
     <button className="admin-icon-btn" disabled={index===0} onClick={()=>reorder(key,index,-1)} aria-label={`نقل «${item.title}» للأعلى`}>↑</button>
     <button className="admin-icon-btn" disabled={index===items.length-1} onClick={()=>reorder(key,index,1)} aria-label={`نقل «${item.title}» للأسفل`}>↓</button>
     {pending===id?<><button className="admin-btn is-danger" onClick={()=>remove(key,item.id,item.title)}>تأكيد الإزالة</button><button className="admin-btn is-quiet" onClick={()=>setPending(null)}>إلغاء</button></>:<button className="admin-btn is-quiet" onClick={()=>setPending(id)}>إزالة</button>}
    </span>
   </li>})}</ol>:<p className="admin-empty">لا توجد عناصر بعد.</p>}
  </section>})}
 </div>
}
