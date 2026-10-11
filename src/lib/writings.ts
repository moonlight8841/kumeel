import type {Writing} from '../content'
export function sortedWritings(writings:Writing[]){return [...writings].sort((a,b)=>(b.publishedAt?Date.parse(b.publishedAt):0)-(a.publishedAt?Date.parse(a.publishedAt):0))}
