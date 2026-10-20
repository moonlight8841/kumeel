// Reading journey: write → think → discuss → learn → share → keep → who.
import {TEACHERS_PUBLIC} from './features'
// Full order including hidden sections; siteNav is what the header shows.
export const fullSiteNav=[['/','الرئيسية'],['/writings','الكتابات'],['/observatory','مرصد الأفكار'],['/salon','مجلس الحوار'],['/teachers','مجلس التعلّم'],['/community','المجتمع'],['/library','المكتبة'],['/music','الموسيقى والفيديو'],['/about','عن كميل']] as const
export const siteNav=fullSiteNav.filter(([href])=>TEACHERS_PUBLIC||href!=='/teachers')

export function isCurrentPath(href:string,current?:string){
 if(!current)return false
 if(href==='/')return current==='/'
 return current===href||current.startsWith(`${href}/`)||(href==='/observatory'&&current.startsWith('/ideas/'))||(href==='/writings'&&current.startsWith('/writings'))
}
