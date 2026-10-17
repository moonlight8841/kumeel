# إعدادات محادثة الكتابات

المشروع: `/home/bob/kumeel`، الموقع: `https://kumeelalnahab.com`.

- إعدادات النشر والحساب والدومين: `wrangler.jsonc`.
- أسرار الخادم المحلية: `.dev.vars`، صلاحية `0600`، مستبعدة من Git؛ لا تُنسخ إلى `src/` أو `dist/`.
- الاسمان المطلوبان: `GEMINI_API_KEY` و`CHAT_RATE_SECRET`؛ الإنتاج يستخدم Cloudflare Worker secrets.
- مزوّد Gemini ونماذجه الافتراضية: `api/_shared/owner-ai.mjs`. يمكن ضبط `GEMINI_MODEL` و`GEMINI_FALLBACK_MODELS` في `vars` داخل Wrangler دون أي مفاتيح.
- تعليمات الإجابة، طول الرسالة، السياق والمصادر: `api/chat.mjs`.
- بنية وحدود الاستخدام: `supabase/chat.sql`. القيم الفعلية في `kumeel_private.chat_settings`: 4 بالدقيقة و30 يوميًا للزائر و400 يوميًا للموقع. لا تعِد تطبيق التهيئة أو تغيير بصمة السر دون موافقة وتوثيق.
- الواجهة: `src/components/ReaderChat.tsx`؛ الزر «اسأل الكتابات» يظهر عندما يعيد `/api/chat` القيمة `enabled: true`.

## تجهيز الأسرار

`node scripts/chat-secrets.mjs init` ينشئ `.dev.vars` فقط إذا لم يوجد، بمفتاح Gemini الموجود في `.env.local` وسر جديد عشوائي. لا يعيد إنشاء الأسرار الموجودة.

`node scripts/chat-secrets.mjs hash` يعرض بصمة SHA-256 فقط لتسجيلها في صف الإعدادات، وليس السر. تحديث البصمة في قاعدة البيانات يحتاج موافقة وتحققًا مستقلًا؛ رفع الأسرار وحده لا يطابقها تلقائيًا.

بعد مطابقة البصمة، ومن جلسة مصادق عليها في Cloudflare:

```bash
node scripts/chat-secrets.mjs upload
npm run test:published
```

يرفع الأمر السرّين المسموحين فقط عبر stdin؛ لا يرفع `.env` أو مفاتيح إدارة Supabase/GitHub. عملية الرفع تفعّل نسخة Worker بأسرارها الجديدة، لذلك ليست فحصًا للقراءة فقط.

الفحص المحلي للـWorker بدون أسرار يستخدم `CHAT_EXPECTED_ENABLED=false`، والفحص البعيد عبر `test:release` مع المحادثة المفعلة يستخدم `CHAT_EXPECTED_ENABLED=true`.

## فحص التفعيل 2026-10-15

نجح `npm run verify` و`npm run test:published` وفحص `test:release` على الموقع مع `CHAT_EXPECTED_ENABLED=true`. نجحت إجابة فعلية بمصدر منشور، وظهر الزر في متصفح Chromium. اختُبر RPC فعليًا: أول أربعة طلبات مسموحة والخامس مرفوض بحد الدقيقة دون استدعاء المزوّد.

فحص Supabase الأمني يُظهر تنبيهات قائمة على دوال `SECURITY DEFINER` المتاحة لأدوار العملاء، ومنها دالة الحصة المحمية بسر الخادم؛ تمت مراجعة تعريفها الفعلي ويتحقق من السر قبل أي تعديل. الجداول الخاصة محمية بـRLS دون سياسات مباشرة عمدًا. لا يمثل هذا الفحص تدقيقًا شاملًا لجميع دوال الموقع.

حماية كلمات المرور المسرّبة في Auth غير مفعلة أيضًا؛ لم تُغيّر ضمن تفعيل المحادثة. المراجع: [صلاحيات الدوال](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)، [حماية كلمات المرور](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## التراجع

قبل تدوير سر الربط في 2026-10-15 حُفظت إعداداته في `.secrets/chat-settings-before-20261015.json` خارج Git بصلاحية `0600`. يمكن إيقاف المحادثة من `chat_settings.enabled` فورًا إذا لزم. استعادة البصمة السابقة وحدها لا تستعيد قيمة السر السابقة؛ يلزم توافق أسرار Worker مع البصمة المستعادة.
