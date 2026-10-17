export type AuthOperation='mail'|'password'
export function authRequestFailure(error:unknown,operation:AuthOperation):{message:string;cooldown:number}{
 const e=error&&typeof error==='object'?error as {status?:number;code?:string}:{}
 if(e.code==='over_email_send_rate_limit')return {message:'بلغت خدمة البريد حد الإرسال المتاح. حاول لاحقًا، أو استخدم كلمة المرور إن كانت معدّة لحسابك.',cooldown:60}
 if(e.status===429)return {message:'طلبات كثيرة في وقت قصير. انتظر قبل إعادة المحاولة.',cooldown:60}
 if(['captcha_failed','captcha_error'].includes(e.code??''))return {message:'لم ينجح التحقق من المتصفح. أعد التحقق ثم حاول مجددًا.',cooldown:3}
 if(operation==='password')return {message:'تعذّر تسجيل الدخول. تحقق من بياناتك والاتصال ثم أعد المحاولة.',cooldown:3}
 return {message:'تعذّر إتمام طلب البريد. أعد التحقق من البيانات والاتصال ثم حاول لاحقًا.',cooldown:3}
}
export const cooldownRemaining=(deadline:number,now=Date.now())=>Math.max(0,Math.min(3600,Math.ceil((deadline-now)/1000)))
export const authCooldownKey=(operation:AuthOperation)=>`kumeel-auth-cooldown:${operation}`
