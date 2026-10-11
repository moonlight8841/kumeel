# Authentication deployment

Visitor registration is open. Supabase email confirmation is enabled. Client registration requires a password of 14?128 characters; configure the same minimum in Supabase Auth password settings to cover direct API callers.

Run `harden-auth.sql` after `setup-platform.sql`. Administrative database and media writes require a confirmed email, a database editor membership, and an AAL2 JWT. Visitor signup cannot grant membership. The interface independently verifies the user against Auth and checks membership and MFA before displaying administrative controls.

Sessions use tab sessionStorage. PKCE verifiers alone use expiring localStorage for email links opened in another tab. The administration UI signs out locally after 15 minutes without interaction. This client timeout is not a substitute for server JWT expiry and session policies. Global signout revokes refresh tokens; already issued access tokens remain valid until expiry.

Production Turnstile is configured for `kumeel-nine.vercel.app`; its public site key lives in `src/auth-config.json` and its secret is stored only in Supabase Auth CAPTCHA settings. Supabase performs server-side verification of `captchaToken`; do not redeem the token in a second custom Siteverify handler. Test missing, invalid, fresh, and replayed tokens against the actual Auth endpoint before declaring bot protection enabled. Configure provider rate limits in Supabase; interface cooldowns only improve usability.

The owner must enroll a TOTP authenticator at first administrative login and complete its challenge. Store the manual setup secret safely before closing enrollment. No recovery bypass or client-side role assignment is provided. Do not share an owner session for testing.

Cloudflare official skills are installed globally and its MCP OAuth connection is registered. Restart Codex to load the newly registered MCP tools before creating the widget. The Supabase MCP connection currently cannot administer the selected project, so its CAPTCHA secret and password policy require configuration through that project's dashboard.

The sole administrator is `komeil9060@gmail.com`. Run `activate-owner.sql` after this account registers and confirms its email. The script revokes all other editor memberships. `kumeelalnahab@gmail.com` remains the public contact address and an ordinary visitor account.

Production Turnstile widget: `0x4AAAAAAFTrC5bcPSEVrVIr`, restricted to `kumeel-nine.vercel.app`. The owner configured its secret in Supabase Auth. Direct missing/invalid CAPTCHA requests are verified separately; successful human completion and replay require a fresh real token. Local authentication requires its own development widget/provider configuration.
