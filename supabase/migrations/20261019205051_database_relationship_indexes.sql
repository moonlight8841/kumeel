-- Small existing tables: atomic indexes with a short lock timeout.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create index if not exists kumeel_comments_post_status on public.kumeel_community_comments(post_id, status);
create index if not exists kumeel_review_log_reviewer on public.kumeel_review_log(reviewer_id);
create index if not exists kumeel_owner_ai_quota_scope on kumeel_private.owner_ai_quota(scope);
