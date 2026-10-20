export const MAX_BOOK_BYTES=50*1024*1024

// Basic format checks, not a malware scanner. Only authenticated MFA editors upload.
export async function validateBookPdf(file:File):Promise<void>{
 if(!/\.pdf$/i.test(file.name)||file.type!=='application/pdf'||file.size<12||file.size>MAX_BOOK_BYTES)throw new Error('اختر ملف PDF صالحًا بحجم لا يتجاوز ٥٠ ميغابايت.')
 const header=await file.slice(0,8).text()
 const tail=await file.slice(Math.max(0,file.size-2048)).text()
 if(!/^%PDF-[12]\.[0-9]/.test(header)||!tail.includes('%%EOF'))throw new Error('محتوى الملف لا يطابق صيغة PDF أو أن الملف غير مكتمل.')
}
