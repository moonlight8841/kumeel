# الواجهة الإنجليزية والترجمات المراجَعة

العربية هي الأصل واللغة الافتراضية، وروابطها لا تتغير. الإنجليزية سطح محدود تحت `/en/`:

| المسار | يظهر عندما | بدونه |
|---|---|---|
| `/en/` و`/en/writings` | دائمًا | قائمة فارغة برسالة «No English translations» |
| `/en/about` | توجد نبذة إنجليزية معتمدة وحديثة | صفحة إشعار `noindex` مع رابط الأصل |
| `/en/writings/<id>` | توجد ترجمة معتمدة لنص الأصل الحالي | 404 و`noindex` |
| أي قسم آخر تحت `/en/` | — | 404؛ روابط التذييل تشير إلى الأقسام العربية بوسم «(Arabic)» |

المحاور في الصفحات الإنجليزية يبقى عربيًا ويُفصح عن ذلك. لا تحويل تلقائي حسب البلد أو لغة المتصفح؛ زر اللغة يحفظ اختيار الزائر فقط.

## دورة الترجمة

من لوحة الإدارة ← «مساعد التحرير» ← «الترجمة الإنجليزية»:

1. **اقترح ترجمة آلية** (اختياري): يرسل العنوان والنص إلى Gemini أو Workers AI، والنتيجة تُحفظ **مسودة خاصة** فقط. إن تغيّر النص العربي أثناء الانتظار تُهمل النتيجة.
2. **حفظ كمسودة خاصة**: الترجمة اليدوية أو المعدّلة. المسودات الخاصة (`translationDrafts`) لا تدخل المحتوى العام أبدًا.
3. **اعتماد للنشر**: ينسخ المسودة إلى الفهرس المعتمد (`translations`) مختومة ببصمة الأصل الحالي. لا ينشر شيئًا بنفسه.
4. **النشر والحساب ← تأكيد النشر العام**: النشر المحمي بالمراجعة (revision). قبل النشر تُحفظ المسودة السحابية الخاصة حتى لا تضيع الترجمات غير المعتمدة.

«سحب الاعتماد» يحجب الترجمة بعد النشر التالي ويُبقي المسودة الخاصة. «حذف المسودة الخاصة» لا يمس المعتمد.

## الحداثة: بصمة الأصل

كل ترجمة تحمل `sourceHash`: SHA-256 لنص مؤطَّر بدقة:

- النبذة: `kumeel-translation-v1\nbio\n` + النبذة.
- الكتابة: `kumeel-translation-v1\nwriting\n` + العنوان + NUL + النص + NUL + (`format` أو `plain`).

أي تعديل في العنوان أو النص أو الصيغة — ولو مسافة — يجعل الترجمة المعتمدة غير صالحة، فتختفي من الصفحات وخريطة الموقع وروابط `hreflang` حتى تُراجع وتُعتمد من جديد. يُحسب ذلك في `src/lib/source-hash.mjs` وعلى الخادم والـWorker والتوليد المسبق والمتصفح، ويُفرض في قاعدة البيانات بقيد `kumeel_published_reviewed_translations` الذي يعيد حساب البصمة نفسها بـpgcrypto.

## البحث

- لكل صفحة canonical ذاتي، و`og:locale` (`ar_SA` أو `en_US`)، و`og:site_name` بلغتها.
- `hreflang` لـ`ar` و`en` و`x-default` فقط للأزواج الصالحة؛ `og:locale:alternate` بالمثل.
- المقال الإنجليزي يحمل `inLanguage: en` و`translationOfWork` إلى الأصل العربي، مع هوية المؤلف `Person` نفسها.
- خريطة الموقع تضم `/en/` و`/en/writings` دائمًا، والنبذة والمقالات الإنجليزية الحديثة المعتمدة فقط. الكتابات التجريبية تبقى خارج الفهرسة باللغتين.

## الفحص

```bash
npm run lint
npm test                       # يشمل test-i18n وtest-translations وtest-edit-assist
npm run build && node scripts/dev-worker.mjs --port 8799
WORKER_TEST_URL=http://127.0.0.1:8799 node scripts/test-release.mjs
```

فحوص قاعدة البيانات على Postgres محلي مؤقت فقط، ببيانات اصطناعية:

```bash
docker run -d --rm --name kumeel-verify-db -e POSTGRES_PASSWORD=local-only -v "$PWD/supabase:/sb:ro" postgres:17-alpine
for f in tests/translation-bootstrap.sql migrations/20260907131331_kumeel_personal_space.sql \
         migrations/20261015190550_reviewed_translations.sql tests/translations.sql tests/translation-rollback.sql; do
  docker exec kumeel-verify-db psql -U postgres -v ON_ERROR_STOP=1 -q -f /sb/$f || break
done
docker rm -f kumeel-verify-db
```

لا تشغّل `translation-bootstrap.sql` على أي مشروع مستضاف.

## الإطلاق والرجوع

الإطلاق يحتاج موافقة منفصلة من المالك بعد المعاينة، وبهذا الترتيب:

1. تأكد أن المشروع هو `jigypvbqiuakdatkzoul`، وأن `extensions.digest` (pgcrypto) متاح، وخذ نسخة من صف `kumeel_published` وتعريفات القيود الحالية.
2. طبّق `supabase/migrations/20261015190550_reviewed_translations.sql` وحده. هو إضافي: دالة وقيد CHECK؛ المحتوى الحالي بلا `translations` يبقى صالحًا. لا تشغّل `setup-platform.sql` أو reset أو seed.
3. افحص advisors، وجرّب رفض `translationDrafts` على نسخة تجريبية لا على الصف الحي.
4. انشر الـWorker بعد `npm run verify`، ثم `npm run test:published`.

**الرجوع**: انشر إصدار الـWorker السابق، ثم نفّذ `supabase/tests/translation-rollback.sql` (يحذف القيد والدالة فقط ويحفظ كل الصفوف). العربية والمسودات الخاصة لا تتأثر. إن كانت هناك ترجمات منشورة فستبقى في JSON المنشور لكن الإصدار السابق يتجاهلها؛ احذفها صراحة من لوحة الإدارة إن أردت إزالتها.
