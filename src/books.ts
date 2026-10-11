import catalog from './books-catalog.json'
export type Book = {id:string; title:string; subtitle:string; author:string; category:'english'|'philosophy'; focus:string; description:string; pages:number; bytes:number; language:string; fileUrl?:string; featured:boolean; order:number; review?:string; quote?:string; quoteSource?:string}
export const defaultBooks = catalog as Book[]
export const bookCategories = {english:'تعلّم الإنجليزية',philosophy:'الفلسفة'}
export const bookFocus:Record<string,string> = {grammar:'القواعد',vocabulary:'المفردات',conversation:'المحادثة',pronunciation:'النطق',writing:'الكتابة',general:'تعلّم الإنجليزية',philosophy:'الفلسفة'}
export function booksFor(content:{books?:Book[]}):Book[]{return content.books??defaultBooks}
export function validBooks(value:unknown):value is Book[]{
 if(!Array.isArray(value)||value.length>500)return false
 const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max&&Boolean(v.trim())
 return value.every(b=>b&&(b.review===undefined||(typeof b.review==='string'&&b.review.length<=2000))&&(b.quote===undefined||(typeof b.quote==='string'&&b.quote.length<=1000))&&(b.quoteSource===undefined||(typeof b.quoteSource==='string'&&b.quoteSource.length<=300))&&text(b.id,150)&&/^[a-z0-9-]+$/.test(b.id)&&text(b.title,200)&&text(b.subtitle,200)&&text(b.author,200)&&text(b.description,2000)&&['english','philosophy'].includes(b.category)&&Object.prototype.hasOwnProperty.call(bookFocus,b.focus)&&text(b.language,20)&&Number.isInteger(b.pages)&&b.pages>=1&&b.pages<=10000&&Number.isInteger(b.bytes)&&b.bytes>=0&&b.bytes<=50*1024*1024&&typeof b.featured==='boolean'&&Number.isInteger(b.order)&&b.order>=0&&(b.fileUrl===undefined||validBookUrl(b.fileUrl)))&&new Set(value.map(b=>b.id)).size===value.length
}
export function validBookUrl(value:unknown):value is string{
 if(typeof value!=='string'||value.length>2000||[...value].some(c=>c.charCodeAt(0)<=32||c.charCodeAt(0)===127))return false
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname.toLowerCase().endsWith('.pdf')}catch{return false}
}
