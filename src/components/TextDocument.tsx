import type {ReactNode} from 'react'
function inline(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part)}
export function TextDocument({text,format}:{text:string;format?:'plain'|'markdown'}){
 if(format!=='markdown')return <>{text.split('\n\n').map((p,i)=><p className="preserve-lines" key={i}>{p}</p>)}</>
 const blocks=text.split(/\n\s*\n/)
 return <>{blocks.map((block,i)=>{
  const lines=block.split('\n')
  if(lines.every(line=>/^[-*] /.test(line)))return <ul key={i}>{lines.map((line,j)=><li key={j}>{inline(line.slice(2))}</li>)}</ul>
  if(lines.every(line=>/^> /.test(line)))return <blockquote className="document-quote" key={i}>{lines.map((line,j)=><p key={j}>{inline(line.slice(2))}</p>)}</blockquote>
  return <div className="document-block" key={i}>{lines.map((line,j)=>/^## /.test(line)?<h2 key={j}>{inline(line.slice(3))}</h2>:/^### /.test(line)?<h3 key={j}>{inline(line.slice(4))}</h3>:<p className="document-line" key={j}>{inline(line)}</p>)}</div>
 })}</>
}
