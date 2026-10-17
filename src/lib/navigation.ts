import {teachersPublicEnabled} from '../site'
// Reading journey: write → think → discuss → learn → share → keep → who.
const allSiteNav=[['/','الرئيسية'],['/writings','الكتابات'],['/observatory','مرصد الأفكار'],['/salon','مجلس الحوار'],['/teachers','مجلس التعلّم'],['/community','المجتمع'],['/library','المكتبة'],['/about','عن كميل']] as const
export const siteNav=allSiteNav.filter(([href])=>teachersPublicEnabled||href!=='/teachers')

export function isCurrentPath(href:string,current?:string){
 if(!current)return false
 if(href==='/')return current==='/'
 return current===href||current.startsWith(`${href}/`)||(href==='/observatory'&&current.startsWith('/ideas/'))||(href==='/writings'&&current.startsWith('/writings'))
}

// Post-login return target: same-origin path only, never a protocol-relative or encoded escape.
export function safeNext(value:string|null|undefined,origin:string):string|null{
 if(!value||value.length>300||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||[...value].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))return null
 try{const url=new URL(value,origin);return url.origin===origin?url.pathname+url.search+url.hash:null}catch{return null}
}
