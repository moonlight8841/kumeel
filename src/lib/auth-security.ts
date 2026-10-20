import config from '../auth-config.json'
export const captchaConfigured = Boolean(config.turnstileSiteKey)
export const googleConfigured = config.googleSignInEnabled
export const MIN_PASSWORD_LENGTH = 14
// Admin-issued recovery emails use token callbacks; browser-initiated flows use PKCE.
export function authCallbackFlow(hash: string): 'pkce' | 'implicit' {
 const params = new URLSearchParams(hash.replace(/^#/, ''))
 return params.get('type') === 'recovery' && Boolean(params.get('access_token')) && Boolean(params.get('refresh_token')) ? 'implicit' : 'pkce'
}
export function validNewPassword(password: string): boolean {
 return [...password].length >= MIN_PASSWORD_LENGTH && [...password].length <= 128
}
export function safeAuthReturnUrl(origin: string, destination: '/admin' | '/member' = '/admin'): string {
 const url = new URL(origin)
 if (url.origin !== 'https://kumeel-nine.vercel.app' && url.origin !== 'https://kumeel-platform.kumeel9060.workers.dev' && url.origin !== 'https://kumeelalnahab.com' && url.origin !== 'https://www.kumeelalnahab.com' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '5173')) throw new Error('هذا العنوان غير معتمد لتسجيل الدخول.')
 return `${url.origin}${destination}`
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
