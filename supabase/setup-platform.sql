-- Target project: jigypvbqiuakdatkzoul. Run once in Supabase SQL Editor as administrator.
-- Does not create accounts or grant owner access. After verified signup, use activate-owner.sql.
begin;
-- Applied using the Management API; the server-generated migration is archived below.
create table public.kumeel_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.kumeel_editors enable row level security;
revoke all on public.kumeel_editors from anon, authenticated;
grant select on public.kumeel_editors to authenticated;
create policy "Editors see their own membership" on public.kumeel_editors
  for select to authenticated using (user_id = (select auth.uid()));

create table public.kumeel_published (
  id text primary key check (id = 'main'),
  content jsonb not null check (
    jsonb_typeof(content) = 'object' and
    jsonb_typeof(content->'bio') = 'string' and
    jsonb_typeof(content->'writings') = 'array' and
    jsonb_typeof(content->'media') = 'array' and
    octet_length(content::text) <= 4000000
  ),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.kumeel_published enable row level security;
revoke all on public.kumeel_published from anon, authenticated;
grant select on public.kumeel_published to anon, authenticated;
grant update(content) on public.kumeel_published to authenticated;
create policy "Public reads published content" on public.kumeel_published
  for select to anon, authenticated using (true);
create policy "Only editors publish" on public.kumeel_published
  for update to authenticated
  using (exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())))
  with check (exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));

create table public.kumeel_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 4000000),
  updated_at timestamptz not null default now()
);
alter table public.kumeel_drafts enable row level security;
revoke all on public.kumeel_drafts from anon, authenticated;
grant select,insert,update,delete on public.kumeel_drafts to authenticated;
create policy "Editors manage only their own drafts" on public.kumeel_drafts
  for all to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));

create function public.kumeel_touch_content() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_table_name = 'kumeel_published' then
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;
revoke all on function public.kumeel_touch_content() from public, anon, authenticated;
create trigger kumeel_published_updated before update on public.kumeel_published
for each row execute function public.kumeel_touch_content();
create trigger kumeel_drafts_updated before update on public.kumeel_drafts
for each row execute function public.kumeel_touch_content();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('kumeel-media','kumeel-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
create policy "Kumeel editors upload media" on storage.objects
for insert to authenticated with check (bucket_id = 'kumeel-media' and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));
create policy "Kumeel editors inspect media" on storage.objects
for select to authenticated using (bucket_id = 'kumeel-media' and exists(select 1 from public.kumeel_editors where user_id = (select auth.uid())));

insert into public.kumeel_published(id,content) values ('main','{"site":{"heroTitle":"سؤالٌ يوقظ الفكر،\nوحوارٌ يفتح الأفق.","heroSubtitle":"مساحة للفلسفة والعلم والثقافة.\nنختبر الأفكار، وننصف الأسئلة، ونتعلّم معًا.","heroImage":"/images/desert.png","heroImageAlt":"مشهد فني لكثبان الصحراء ومسافر صغير في الأفق","quote":"لسنا ما نملك من الأشياء،\nبل ما نتركه في الآخرين من أثر.","quoteSource":"فكرة تفتح باب هذه المساحة","contactTitle":"لنفتح بابًا لفكرة جديدة.","email":"kumeelalnahab@gmail.com","tiktok":"kumeelalnahab","whatsapp":"966558232644","showEmail":true,"showTiktok":true,"showWhatsapp":true,"theme":"olive","sections":[{"key":"hero","label":"الرئيسية","visible":true},{"key":"story","label":"من هو كميل؟","visible":true},{"key":"writings","label":"كتاباتي","visible":true},{"key":"explore","label":"اكتشف","visible":true},{"key":"observatory","label":"مرصد الأفكار","visible":true},{"key":"salon","label":"مجلس الحوار","visible":true},{"key":"quote","label":"فكرة للتأمل","visible":true},{"key":"contact","label":"تواصل","visible":true}]},"bio":"أنا كميل ال نهاب. أريد لهذه المساحة أن تكون نافذة للفلسفة والعلم والثقافة؛ أشارك فيها الأفكار التي تستحق التأمل، وأفتح أسئلة للتعلّم والحوار. المعرفة هنا دعوة إلى الفهم، وإلى مراجعة ما نظنه بديهيًا.","writings":[{"id":"meaning","title":"عن الأشياء التي تبقى","category":"تأملات","text":"ربما لا تُقاس الحياة بعدد الأيام التي مرّت، بل بعدد المرات التي كنّا فيها حاضرين حقًا.\n\nفي حديثٍ لم نستعجل نهايته، في طريقٍ مشيناه دون أن ننظر إلى الساعة، وفي يدٍ امتدت حين ضاقت الكلمات.\n\nلا يبقى من الطريق غباره، بل ما تغيّر فينا ونحن نعبره. وما نمنحه للحياة من انتباه، تعيده إلينا على هيئة معنى."},{"id":"light","title":"للضوء نافذة أخرى","category":"شعر","text":"أتركُ للضوءِ بابًا مواربًا\nلعلّ صباحًا يمرّ\nوأجمعُ من صمتِ هذا الطريق\nكلامًا يليقُ بما لا يُقال\n\nفما كلُّ من سارَ يعرفُ دربًا\nولكنّ في السيرِ بعضَ الوصول."},{"id":"slow","title":"أن تمضي على مهل","category":"تأملات","text":"هناك جمال لا يكشف نفسه للمستعجل. ظل شجرة يتبدّل، ورائحة كتاب قديم، ووجه مألوف نراه كأننا نراه للمرة الأولى.\n\nأن تمضي على مهل، هو أن تمنح الأشياء فرصة لتصل إليك. ليس كل توقف تأخرًا؛ بعض الوقوف عودة إلى النفس."}],"media":[],"ideas":[{"id":"certainty","kind":"حكمة","title":"ماذا لو كان يقينك سؤالًا مؤجلًا؟","text":"الفكرة التي لا نسمح بمساءلتها قد تصبح حاجزًا أمام الفهم. جرّب أن تكتب ما تعتقده، ثم الدليل الذي قد يجعلك تغيّر رأيك.","question":"ما القناعة التي تستطيع مراجعتها دون أن تفقد احترامك لنفسك؟","counterpoint":"ليست كل قناعة هشّة. بعض المواقف تستند إلى أدلة قوية؛ المراجعة لا تعني مساواة كل الآراء.","sample":true},{"id":"opposite","kind":"تجربة فكرية","title":"دافع عن الفكرة التي تخالفها","text":"اختر خلافًا بسيطًا. اكتب أقوى حجة للطرف الآخر، كما لو كنت تريد أن يفهمها قارئ منصف. ثم ارجع إلى موقفك: هل تغيّر اعتراضك؟","question":"هل اختلفت مع الفكرة نفسها، أم مع أضعف نسخة منها؟","counterpoint":"فهم موقف لا يلزمك بقبوله. الهدف اختبار عدالة الاعتراض، لا التخلّي عن حكمك.","sample":true},{"id":"claim","kind":"درس","title":"من العبارة الجذابة إلى السؤال الدقيق","text":"عند قراءة ادعاء مثير، افصل بين العبارة ودليلها. اسأل: ماذا تعني الكلمات؟ ما الذي تم قياسه؟ وهل توجد تفسيرات أخرى؟\n\nاكتب الادعاء في جملة يمكن اختبارها. إذا تعذّر ذلك، فقد تكون أمام رأي أو استعارة تحتاج إلى نقاش، لا نتيجة تجريبية.","question":"ما المعلومة التي تحتاجها قبل مشاركة هذا الادعاء؟","sample":true}],"sessions":[]}'::jsonb);
commit;
-- Verification: expect all three rows with RLS enabled and a single publication.
select relname,relrowsecurity from pg_class where oid in ('public.kumeel_editors'::regclass,'public.kumeel_published'::regclass,'public.kumeel_drafts'::regclass);
select id,revision from public.kumeel_published where id='main';
