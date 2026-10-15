import {localePath,messages,type Locale} from '../lib/i18n'
export function LanguageSwitch({locale,arabicPath,englishAvailable=true}:{locale:Locale;arabicPath:string;englishAvailable?:boolean}){
 let en='/en/'
 try{en=localePath('en',arabicPath)}catch{/* Sections outside phase one point to the English home. */}
 if(!englishAvailable)en='/en/writings?translation=unavailable'
 const remember=(next:Locale)=>{try{localStorage.setItem('kumeel-language',next)}catch{/* Preference is optional; links always work. */}}
 return <nav className="language-switch" aria-label={messages[locale].language}>
  <a href={arabicPath} lang="ar" hrefLang="ar" aria-current={locale==='ar'?'page':undefined} onClick={()=>remember('ar')}>العربية</a>
  <span aria-hidden="true"> | </span>
  <a href={en} lang="en" hrefLang="en" aria-current={locale==='en'?'page':undefined} onClick={()=>remember('en')}>English</a>
 </nav>
}
