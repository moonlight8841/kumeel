import type {Content} from '../content'
import {booksFor} from '../books'
import {sortedWritings} from './writings'
export function contentForPage(content:Content,path:string,now=Date.now()):Content{
 const p=path.replace(/\/+$/,'')||'/'
 if(p==='/admin')return content
 const base:Content={bio:content.bio,site:content.site,writings:[],media:[],ideas:[],sessions:[],books:[]}
 if(p==='/')return {...base,writings:sortedWritings(content.writings).slice(0,2),ideas:(content.ideas??[]).slice(0,1),sessions:[...(content.sessions??[])].filter(s=>!s.cancelled&&Date.parse(s.startsAt)+s.durationMinutes*60000>now).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)).slice(0,1)}
 if(p==='/writings')return {...base,writings:content.writings}
 if(p.startsWith('/writings/'))return {...base,writings:content.writings.filter(w=>`/writings/${encodeURIComponent(w.id)}`===p)}
 if(p==='/observatory')return {...base,ideas:content.ideas,media:content.media,quiz:content.quiz}
 if(p.startsWith('/ideas/'))return {...base,ideas:(content.ideas??[]).filter(i=>`/ideas/${encodeURIComponent(i.id)}`===p)}
 if(p.startsWith('/media/'))return {...base,media:content.media.filter(m=>`/media/${encodeURIComponent(m.id)}`===p)}
 if(p==='/salon')return {...base,sessions:content.sessions}
 if(p==='/library')return {...base,books:booksFor(content)}
 if(p.startsWith('/library/'))return {...base,books:booksFor(content).filter(b=>`/library/${b.id}`===p)}
 if(p==='/explore')return {...base,discoveries:content.discoveries,quiz:content.quiz}
 return base
}
