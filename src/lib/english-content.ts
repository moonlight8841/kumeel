import type {Content} from '../content'
import {englishText as t} from './locale-ui'
import {defaultDiscoveries,defaultQuiz} from '../learning'
import {booksFor} from '../books'

// Presentation copy only: never mutate persisted content, hashes or API enums.
export function englishContent(content:Content):Content{
 return {...content,
  bio:content.translations?.bio?.text??t(content.bio),
  writings:content.writings.map(w=>{const approved=content.translations?.[`writing:${w.id}`];return {...w,title:approved?.title??t(w.title),text:approved?.text??t(w.text)}}),
  ideas:content.ideas?.map(i=>({...i,title:t(i.title),text:t(i.text),question:t(i.question),counterpoint:i.counterpoint&&t(i.counterpoint),source:i.source&&t(i.source)})),
  discoveries:(content.discoveries??defaultDiscoveries).map(d=>({...d,title:t(d.title),intro:t(d.intro),text:t(d.text),time:t(d.time)})),
  quiz:(content.quiz??defaultQuiz).map(q=>({...q,title:t(q.title),options:q.options.map(t),why:t(q.why)})),
  media:content.media.map(m=>({...m,title:t(m.title),description:m.description&&t(m.description),source:m.source&&t(m.source)})),
  sessions:content.sessions?.map(s=>({...s,title:t(s.title),question:t(s.question),notes:s.notes&&t(s.notes),summary:s.summary&&t(s.summary),prepare:s.prepare&&t(s.prepare)})),
  books:booksFor(content).map(b=>({...b,subtitle:t(b.subtitle),description:t(b.description),review:b.review&&t(b.review),quote:b.quote&&t(b.quote)})),
  site:content.site&&{...content.site,heroTitle:t(content.site.heroTitle),heroSubtitle:t(content.site.heroSubtitle),heroImageAlt:t(content.site.heroImageAlt),quote:t(content.site.quote),quoteSource:t(content.site.quoteSource),contactTitle:t(content.site.contactTitle)},
 }
}
