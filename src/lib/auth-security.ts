import config from '../auth-config.json'
export const captchaConfigured = Boolean(config.turnstileSiteKey)
export const MIN_PASSWORD_LENGTH = 14
export function validNewPassword(password: string): boolean {
 return [...password].length >= MIN_PASSWORD_LENGTH && [...password].length <= 128
}
export function safeAuthReturnUrl(origin: string): string {
 const url = new URL(origin)
 if (url.origin !== 'https://kumeel-nine.vercel.app' && url.origin !== 'https://kumeel-platform.kumeel9060.workers.dev' && url.origin !== 'https://kumeelalnahab.com' && url.origin !== 'https://www.kumeelalnahab.com' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '5173')) throw new Error('هذا العنوان غير معتمد لتسجيل الدخول.')
 return `${url.origin}/admin`
}
// Provider errors are untrusted input. Render fixed messages, never their description.
export function authLinkError(url:URL):'expired'|'failed'|null{
 const query=url.searchParams,fragment=new URLSearchParams(url.hash.slice(1))
 const code=query.get('error_code')??fragment.get('error_code')
 const normalized=query.get('auth_error')
 if(code==='otp_expired'||normalized==='expired')return 'expired'
 if(query.has('error')||query.has('error_code')||fragment.has('error')||fragment.has('error_code')||normalized==='failed')return 'failed'
 return null
}
export function authErrorReturnPath(url:URL):string|null{
 if(!['/','/index.html'].includes(url.pathname))return null
 const error=authLinkError(url)
 return error?`/admin?auth_error=${error}`:null
}
const memory = new Map<string, string>()
export const tabAuthStorage = {
 getItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
   if (key.endsWith('-code-verifier')) {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const record = JSON.parse(raw)
    if (typeof record.value !== 'string' || record.expiresAt <= Date.now()) { localStorage.removeItem(key); return null }
    return record.value
   }
   return sessionStorage.getItem(key)
  } catch { return memory.get(key) ?? null }
 },
 setItem(key: string, value: string) {
  memory.set(key,value)
  if (typeof window === 'undefined') return
  try {
   if (key.endsWith('-code-verifier')) localStorage.setItem(key,JSON.stringify({value,expiresAt:Date.now()+15*60*1000}))
   else sessionStorage.setItem(key,value)
  } catch { /* An ephemeral in-memory session is still usable. */ }
 },
 removeItem(key: string) {
  memory.delete(key)
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(key); localStorage.removeItem(key) } catch { /* Storage may be disabled. */ }
 },
}
