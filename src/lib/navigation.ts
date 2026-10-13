// Reading journey: write → think → discuss → share → keep → who.
export const siteNav=[['/','الرئيسية'],['/writings','الكتابات'],['/observatory','مرصد الأفكار'],['/salon','مجلس الحوار'],['/community','المجتمع'],['/library','المكتبة'],['/about','عن كميل']] as const

export function isCurrentPath(href:string,current?:string){
 if(!current)return false
 if(href==='/')return current==='/'
 return current===href||current.startsWith(`${href}/`)||(href==='/observatory'&&current.startsWith('/ideas/'))||(href==='/writings'&&current.startsWith('/writings'))
}
