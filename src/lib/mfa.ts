export function normalizeTotp(value:string):string{
 return value.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/\s/g,'')
}
export async function totpQrPng(uri:string):Promise<string>{
 const parsed=new URL(uri)
 if(parsed.protocol!=='otpauth:'||parsed.hostname!=='totp'||!parsed.searchParams.get('secret'))throw new Error('Invalid TOTP setup URI')
 const {toDataURL}=await import('qrcode')
 return toDataURL(uri,{type:'image/png',width:264,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}})
}
export function totpQrSource(value:string):string{
 let svg=value
 if(value.startsWith('data:image/svg+xml')){
  const comma=value.indexOf(',');if(comma<0)return ''
  if(value.slice(0,comma).includes(';base64'))return value
  const payload=value.slice(comma+1)
  try{svg=payload.trim().startsWith('<')?payload:decodeURIComponent(payload)}catch{return ''}
 }
 svg=svg.trim().replace(/^<\?xml[^?]*\?>\s*/i,'')
 if(!/^<svg(?:\s|>)/.test(svg))return ''
 return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
