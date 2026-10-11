export function normalizeTotp(value:string):string{
 return value.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/\s/g,'')
}
export function totpQrSource(value:string):string{
 let svg=value
 if(value.startsWith('data:image/svg+xml')){
  const comma=value.indexOf(',');if(comma<0)return ''
  if(value.slice(0,comma).includes(';base64'))return value
  const payload=value.slice(comma+1)
  try{svg=payload.trim().startsWith('<')?payload:decodeURIComponent(payload)}catch{return ''}
 }
 if(!svg.trim().startsWith('<svg'))return ''
 return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
