import {useEffect,useMemo,useRef,useState} from 'react'
import {L} from '../lib/locale-ui'
import type {Writing} from '../content'
import {reflectionExcerpts} from '../lib/reflection'
import './sky-reflection.css'

type Props={quote:string;source:string;writings:Writing[]}
export function SkyReflection({quote,source,writings}:Props){
 const quotes=useMemo(()=>[{text:quote,source,href:''},...reflectionExcerpts(writings)].filter(q=>q.text.trim()),[quote,source,writings])
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false)
 const [visible,setVisible]=useState(false),[pageVisible,setPageVisible]=useState(false),[reduced,setReduced]=useState(true)
 const section=useRef<HTMLElement>(null)
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)')
  const motion=()=>setReduced(media.matches),visibility=()=>setPageVisible(!document.hidden)
  motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility)
  const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting??false),{threshold:0})
  if(section.current)observer.observe(section.current)
  return()=>{observer.disconnect();media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)}
 },[])
 const moving=visible&&pageVisible&&!reduced&&!paused
 useEffect(()=>{
  if(!moving||quotes.length<2)return
  const timer=setInterval(()=>setIndex(i=>(i+1)%quotes.length),18000)
  return()=>clearInterval(timer)
 },[moving,quotes.length])
 const current=quotes[Math.min(index,quotes.length-1)]
 if(!current)return null
 return <L.section ref={section} className={`sky-reflection${moving?'':' is-paused'}`} aria-label="فسحة للتأمل">
  <L.div className="sky-reflection-inner wrap">
   <L.div className="sky-reflection-heading"><L.span className="section-label">فسحة للتأمل</L.span><L.span className="sky-reflection-mark" aria-hidden="true">✦</L.span></L.div>
   <L.blockquote key={index} className="sky-reflection-quote preserve-lines" dir="auto">{current.text}</L.blockquote>
   <L.div className="sky-reflection-footer">
    <L.div className="sky-reflection-source">{current.href?<L.a href={current.href}>{current.source} ←</L.a>:<L.p>{current.source}</L.p>}</L.div>
    <L.div className="sky-reflection-controls">{quotes.length>1&&<L.button type="button" onClick={()=>setIndex(i=>(i+1)%quotes.length)}>اقتباس آخر ←</L.button>}<L.button type="button" disabled={reduced} aria-pressed={paused||reduced} onClick={()=>setPaused(v=>!v)}>{reduced?'تقليل الحركة مفعّل':paused?'تشغيل الحركة والتبديل':'إيقاف الحركة والتبديل'}</L.button></L.div>
   </L.div>
  </L.div>
 </L.section>
}
