import {useEffect} from 'react'
import {validContent,type Content} from '../content'
import {resolveLocalePath} from './i18n'
import {resolvePublishedTranslations} from './localized-content'

export function musicNavigationPath(path:string){
 const r=resolveLocalePath(path)
 return r.supported&&!['/admin','/member'].includes(r.path)&&!r.path.startsWith('/api/')&&(/^\/(music|about|writings|observatory|salon|teachers|community|library|explore)$/.test(r.path)||r.path==='/'||/^\/(writings|ideas|media|library)\/[^/]+$/.test(r.path))
}
// Fetch the destination's scoped public bootstrap data. Keep the existing player DOM alive.
export function useMusicNavigation(enabled:boolean,onNavigate:(content:Content,path:string)=>void){
 useEffect(()=>{
  let pending:AbortController|undefined
  async function navigate(url:URL,pop=false){
   pending?.abort();const controller=new AbortController();pending=controller
   try{
    const response=await fetch(url.href,{signal:controller.signal,headers:{Accept:'text/html'}})
    if(!response.ok||new URL(response.url).origin!==location.origin)throw new Error('Navigation unavailable')
    const doc=new DOMParser().parseFromString(await response.text(),'text/html')
    const parsed:unknown=JSON.parse(doc.getElementById('kumeel-content')?.textContent??'null')
    if(!validContent(parsed))throw new Error('Invalid public content')
    const content=await resolvePublishedTranslations(parsed)
    if(controller.signal.aborted)return
    if(!pop)history.pushState(null,'',url.pathname+url.search+url.hash)
    onNavigate(content,url.pathname)
    requestAnimationFrame(()=>{const target=url.hash?document.getElementById(decodeURIComponent(url.hash.slice(1))):document.querySelector<HTMLElement>('main');if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}if(url.hash)target?.scrollIntoView();else window.scrollTo({top:0,behavior:'instant'})})
   }catch{if(!controller.signal.aborted)location.assign(url.href)}
  }
  const click=(e:MouseEvent)=>{
   if(!enabled||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return
   const a=e.target instanceof Element?e.target.closest('a'):null
   if(!a||a.hasAttribute('download')||(a.target&&a.target!=='_self'))return
   const url=new URL(a.href,location.href)
   if(url.origin!==location.origin||!musicNavigationPath(url.pathname)||url.pathname===location.pathname||url.search)return
   e.preventDefault();void navigate(url)
  }
  const pop=()=>{const url=new URL(location.href);if(musicNavigationPath(url.pathname))void navigate(url,true);else location.reload()}
  document.addEventListener('click',click);window.addEventListener('popstate',pop)
  return()=>{pending?.abort();document.removeEventListener('click',click);window.removeEventListener('popstate',pop)}
 },[enabled,onNavigate])
}
