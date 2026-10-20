import {L} from '../lib/locale-ui'
import {useEffect,useState} from 'react'
type Mode='system'|'light'|'dark'
export function ReadingMode(){
 const [mode,setMode]=useState<Mode>('system')
 const [notice,setNotice]=useState('')
 useEffect(()=>{try{const saved=localStorage.getItem('kumeel-reading-mode');if(saved==='light'||saved==='dark')setMode(saved)}catch{/* Device preference still works. */}},[])
 useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.readingMode=mode==='system'?(media.matches?'dark':'light'):mode};apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply)},[mode])
 return <L.div className="reading-mode"><L.label><L.span className="sr-only">مظهر القراءة</L.span><L.select aria-label="مظهر القراءة" value={mode} onChange={e=>{const next=e.target.value as Mode;setMode(next);try{localStorage.setItem('kumeel-reading-mode',next);setNotice('')}catch{setNotice('تعذّر حفظ المظهر للزيارة المقبلة.')}}}><L.option value="system">◐ حسب الجهاز</L.option><L.option value="light">☀ ورقي</L.option><L.option value="dark">☾ ليلي دافئ</L.option></L.select></L.label>{notice&&<L.span className="sr-only" role="status">{notice}</L.span>}</L.div>
}
