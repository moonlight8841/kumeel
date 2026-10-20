import {L} from '../lib/locale-ui'
import type {ReactNode} from 'react'
function inline(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<L.strong key={i}>{part.slice(2,-2)}</L.strong>:part)}
export function TextDocument({text,format}:{text:string;format?:'plain'|'markdown'}){
 if(format!=='markdown')return <>{text.split('\n\n').map((p,i)=><L.p className="preserve-lines" key={i}>{p}</L.p>)}</>
 const blocks=text.split(/\n\s*\n/)
 return <>{blocks.map((block,i)=>{
  const lines=block.split('\n')
  if(lines.every(line=>/^[-*] /.test(line)))return <L.ul key={i}>{lines.map((line,j)=><L.li key={j}>{inline(line.slice(2))}</L.li>)}</L.ul>
  if(lines.every(line=>/^> /.test(line)))return <L.blockquote className="document-quote" key={i}>{lines.map((line,j)=><L.p key={j}>{inline(line.slice(2))}</L.p>)}</L.blockquote>
  return <L.div className="document-block" key={i}>{lines.map((line,j)=>/^## /.test(line)?<L.h2 key={j}>{inline(line.slice(3))}</L.h2>:/^### /.test(line)?<L.h3 key={j}>{inline(line.slice(4))}</L.h3>:<L.p className="document-line" key={j}>{inline(line)}</L.p>)}</L.div>
 })}</>
}
