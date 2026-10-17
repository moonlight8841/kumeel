# ظهور كميل ال نهاب في البحث

الموقع المعتمد: https://kumeelalnahab.com/، والاسم: **كميل ال نهاب**. الاسم الإنجليزي الموجود في الموقع: **Kumeel Al Nahab**، والكتابة البديلة: كميل آل نهاب.

## ما يجهّزه المشروع

- يبدأ عنوان الرئيسية بالاسم، مع وصف عربي يتضمن الاسم الإنجليزي.
- بيانات JSON-LD تعرّف `Person` و`WebSite` باسم موحد، وتربط `ProfilePage` في `/about` بالشخص نفسه. الكتابات الأصلية تحمل هوية المؤلف نفسها؛ لا ننسب الكتب الخارجية إليه.
- `og:site_name` وcanonical ينتجان على الخادم دون انتظار JavaScript.
- خريطة الموقع `/sitemap.xml` تشمل المنشور فقط، ولا تشمل الإدارة أو مساحة العضو أو الأمثلة.
- الإدارة ومساحة العضو والصفحات المفقودة تحمل `noindex`؛ `robots.txt` يعلن خريطة الموقع ويسمح بقراءة الصفحات العامة.
- لا حسابات اجتماعية مختلقة، ولا مهنة أو صورة شخصية أو تواريخ نشر مصطنعة، ولا كلمات مفتاحية محشوة أو لغات مترجمة غير موجودة.
- النسخة الإنجليزية تحت `/en/` تظهر في الفهرسة وروابط `hreflang` فقط للترجمات التي راجعها المالك واعتمدها لنص الأصل الحالي؛ التفاصيل في `docs/language-translation.md`.

المصدر البرمجي: `src/lib/pages.ts` و`worker/index.mjs`؛ فحوص السلوك ضمن `scripts/test-platform.mjs`، والفحص المنشور ضمن `scripts/test-published.mjs`.

## Google Search Console — خطوة المالك المتبقية

1. افتح https://search.google.com/search-console بحساب Google الذي تريد أن يملك الموقع.
2. أضف خاصية **Domain** باسم `kumeelalnahab.com`، دون `https://` أو مسار.
3. انسخ قيمة TXT التي تمنحها Google، بصيغة `google-site-verification=...`. هذه قيمة إثبات عامة وليست كلمة مرور. يمكن توفيرها لإضافتها إلى DNS في Cloudflare مع إبقاء السجلات الموجودة.
4. اضغط «تحقق» بعد إضافة السجل؛ لا تحذف السجل بعد نجاح التحقق.
5. من Sitemaps أرسل `https://kumeelalnahab.com/sitemap.xml`.
6. من URL Inspection افحص الرئيسية و`/about` والكتابات، ثم اختبر الصفحة المباشرة واطلب الفهرسة.
7. تابع Page indexing وPerformance للبحث باسم «كميل ال نهاب» و«كميل آل نهاب» و`Kumeel Al Nahab`.

لم يُنفّذ إثبات الملكية أو إرسال الخريطة من المشروع، ولا نعتبر نجاح اختبارات HTML دليلًا على قبول Google أو ظهور نتيجة فعلية. لا يوجد ضمان لترتيب أو موعد فهرسة. لا تُستخدم واجهة Indexing API للكتابات العامة، ولا إرسال ping قديم لخريطة الموقع.

## سجل التحقق والنشر — 2026-10-15

نجحت `npm run verify` (lint، البناء، الاختبارات، وحزمة Worker التجريبية). نُشرت النسخة `9d208ffa-b35f-49bd-92bc-3f956422e644` على النطاقين. نسخة التراجع السابقة التي تتضمن أسرار المحادثة: `a728f1a3-5a5a-49e3-8bd3-6f047f9e0db6`؛ لا يتم التراجع دون موافقة المالك.

بعد تأخر قصير في انتشار النسخة، نجح `npm run test:published` بما فيه فحص الاسم وWebSite وProfilePage وcanonical وsitemap واستبعاد الصفحات الخاصة. نجح أيضًا `CHAT_EXPECTED_ENABLED=true WORKER_TEST_URL=https://kumeelalnahab.com npm run test:release`، وظلت المحادثة مفعّلة وواجهات التوليد محمية. أعاد `www` تحويل 308 إلى النطاق الأساسي مع حفظ المسار والاستعلام.

فحص HTTP باستخدام User-Agent باسم Googlebot أعاد 200 للصفحات العامة دون noindex، وnoindex للإدارة والعضو. هذا ليس زيارة من Googlebot الحقيقي ولا إثبات فهرسة. لم تتغير قاعدة البيانات أو المفاتيح ضمن هذا الإصدار.

## مراجع Google

- [اسم الموقع وبيانات WebSite](https://developers.google.com/search/docs/appearance/site-names)
- [صفحة التعريف ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [إثبات ملكية الموقع](https://support.google.com/webmasters/answer/9008080)
- [طلب إعادة الزحف والفهرسة](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
