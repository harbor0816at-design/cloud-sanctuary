-- users: referral, public id, moderation
alter table sanct_users add column if not exists ref_code text;
alter table sanct_users add column if not exists pub_id text;
alter table sanct_users add column if not exists referred_by uuid;
alter table sanct_users add column if not exists candle_credits integer not null default 0;
alter table sanct_users add column if not exists invites integer not null default 0;
alter table sanct_users add column if not exists status text not null default 'active';
alter table sanct_users add column if not exists name_locked boolean not null default false;
update sanct_users set ref_code = substr(md5(random()::text||id::text),1,7) where ref_code is null;
update sanct_users set pub_id = substr(md5(random()::text||id::text||'p'),1,10) where pub_id is null;
create unique index if not exists sanct_users_ref_code_idx on sanct_users(ref_code);
create unique index if not exists sanct_users_pub_id_idx on sanct_users(pub_id);

alter table sanct_rooms add column if not exists status text not null default 'active';
alter table sanct_rooms add column if not exists report_count integer not null default 0;

insert into sanct_config(k,v) values ('pay_provider','stripe') on conflict (k) do update set v='stripe';

create table if not exists sanct_events (
  id bigserial primary key, kind text not null, ref_code text, channel text, target text, ip_hash text,
  created_at timestamptz not null default now());
create index if not exists sanct_events_ref_idx on sanct_events(ref_code, kind);
create index if not exists sanct_events_ip_idx on sanct_events(ip_hash, created_at);
alter table sanct_events enable row level security;

create table if not exists sanct_reports (
  id uuid primary key default gen_random_uuid(), target_type text not null, target_id text, target_label text,
  reason text not null, details text, contact text, ip_hash text, reporter_id uuid,
  status text not null default 'open', action text, created_at timestamptz not null default now(), resolved_at timestamptz);
create index if not exists sanct_reports_status_idx on sanct_reports(status, created_at desc);
create index if not exists sanct_reports_target_idx on sanct_reports(target_type, target_id);
alter table sanct_reports enable row level security;

create or replace function sanct_uid(p_token text) returns uuid
language sql stable security definer set search_path to 'public' as $$
  select s.user_id from sanct_sessions s join sanct_users u on u.id=s.user_id
  where s.token = p_token and s.expires_at > now() and u.status <> 'banned';
$$;

create or replace function sanct_user_json(p_id uuid) returns json
language sql stable security definer set search_path to 'public' as $$
  select json_build_object('id',id,'email',email,'name',display_name,'show_name',show_name and not name_locked,'name_locked',name_locked,'lang',lang,
    'seconds_prayed',seconds_prayed,'candles',candles,'confessions',confessions,'group_sessions',group_sessions,'created_at',created_at,
    'ref_code',ref_code,'pub_id',pub_id,'candle_credits',candle_credits,'invites',invites,
    'ref_visits',(select count(*) from sanct_events e where e.kind='visit' and e.ref_code=u.ref_code))
  from sanct_users u where id = p_id;
$$;

create or replace function sanct_lang_ok(p text) returns text language sql immutable as $$
  select case when p in ('en','fr','de','it','es','zh') then p else 'en' end;
$$;

create or replace function sanct_signup(p_email text, p_password text, p_name text, p_lang text, p_ref text)
returns json language plpgsql security definer set search_path to 'public','extensions' as $$
declare h text := sanct_ip_hash(); e text := lower(btrim(coalesce(p_email,''))); n text := btrim(coalesce(p_name,'')); uid uuid; rid uuid;
begin
  if (select count(*) from sanct_auth_attempts where ip_hash=h and kind='register' and created_at > now()-interval '1 hour') >= 5 then return json_build_object('error','rate_limited'); end if;
  insert into sanct_auth_attempts(ip_hash,kind,ok) values (h,'register',true);
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 120 then return json_build_object('error','bad_email'); end if;
  if char_length(coalesce(p_password,'')) < 8 or char_length(p_password) > 72 then return json_build_object('error','weak_password'); end if;
  if char_length(n) < 1 or char_length(n) > 24 then return json_build_object('error','bad_name'); end if;
  if n ~* '(https?://|www\.|\.com|\.cn|微信|vx|qq[:：]?\s*\d)' or n ~ '\d{7,}' then return json_build_object('error','contact_not_allowed'); end if;
  if exists (select 1 from sanct_users where lower(email)=e) then return json_build_object('error','email_taken'); end if;
  select id into rid from sanct_users where ref_code = nullif(btrim(coalesce(p_ref,'')),'') and status='active';
  insert into sanct_users(email,pass_hash,display_name,lang,ref_code,pub_id,referred_by,candle_credits)
    values (e, extensions.crypt(p_password, extensions.gen_salt('bf',10)), n, sanct_lang_ok(p_lang),
      substr(md5(random()::text||e),1,7), substr(md5(random()::text||e||'p'),1,10), rid, case when rid is not null then 1 else 0 end)
    returning id into uid;
  if rid is not null then
    update sanct_users set invites = invites+1, candle_credits = candle_credits + case when invites < 20 then 1 else 0 end where id=rid;
  end if;
  return json_build_object('token', sanct_new_session(uid), 'user', sanct_user_json(uid));
end $$;

create or replace function sanct_login(p_email text, p_password text) returns json
language plpgsql security definer set search_path to 'public','extensions' as $$
declare h text := sanct_ip_hash(); u record;
begin
  if (select count(*) from sanct_auth_attempts where ip_hash=h and kind='login' and not ok and created_at > now()-interval '15 minutes') >= 10 then return json_build_object('error','rate_limited'); end if;
  select * into u from sanct_users where lower(email)=lower(btrim(coalesce(p_email,'')));
  if u.id is null or u.pass_hash <> extensions.crypt(coalesce(p_password,''), u.pass_hash) then
    insert into sanct_auth_attempts(ip_hash,kind,ok) values (h,'login',false);
    return json_build_object('error','bad_credentials');
  end if;
  if u.status = 'banned' then return json_build_object('error','banned'); end if;
  insert into sanct_auth_attempts(ip_hash,kind,ok) values (h,'login',true);
  return json_build_object('token', sanct_new_session(u.id), 'user', sanct_user_json(u.id));
end $$;

create or replace function sanct_update_profile(p_token text, p_name text, p_show_name boolean, p_lang text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := sanct_uid(p_token); n text := btrim(coalesce(p_name,''));
begin
  if uid is null then return json_build_object('error','auth'); end if;
  if char_length(n) < 1 or char_length(n) > 24 then return json_build_object('error','bad_name'); end if;
  if n ~* '(https?://|www\.|\.com|\.cn|微信|vx|qq[:：]?\s*\d)' or n ~ '\d{7,}' then return json_build_object('error','contact_not_allowed'); end if;
  update sanct_users set display_name=n, show_name=coalesce(p_show_name,true), lang=sanct_lang_ok(p_lang) where id=uid;
  return json_build_object('user', sanct_user_json(uid));
end $$;

create or replace function sanct_create_order(p_token text, p_kind text, p_currency text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := sanct_uid(p_token); cur text := case when p_currency='usd' then 'usd' else 'eur' end; amt int; oid uuid; on_ boolean;
  prov text := coalesce((select v from sanct_config where k='pay_provider'),'stripe');
begin
  if uid is null then return json_build_object('error','auth'); end if;
  if p_kind not in ('candle','confession') then return json_build_object('error','bad_kind'); end if;
  amt := case when p_kind='candle' then 100 else 990 end;
  on_ := coalesce((select v from sanct_config where k='payments_enabled'),'false') = 'true';
  if (select count(*) from sanct_orders where user_id=uid and created_at > now()-interval '1 hour') >= 30 then return json_build_object('error','rate_limited'); end if;
  insert into sanct_orders(user_id,kind,currency,amount_cents,status,provider) values (uid,p_kind,cur,amt, case when on_ then 'pending' else 'beta_free' end, case when on_ then prov end) returning id into oid;
  return json_build_object('id',oid,'status',case when on_ then 'pending' else 'beta_free' end,'amount_cents',amt,'currency',cur);
end $$;

create or replace function sanct_pay_set_ref2(p_id uuid, p_ref text, p_provider text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
begin
  update sanct_orders set provider=p_provider, provider_ref=p_ref where id=p_id and status='pending';
  return found;
end $$;
revoke all on function sanct_pay_set_ref2(uuid,text,text) from public, anon, authenticated;

create or replace function sanct_public_config() returns json
language sql stable security definer set search_path to 'public' as $$
  select json_build_object('payments', coalesce((select v from sanct_config where k='payments_enabled'),'false')='true',
    'provider', coalesce((select v from sanct_config where k='pay_provider'),'stripe'));
$$;

create or replace function sanct_use_credit(p_token text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare uid uuid := sanct_uid(p_token);
begin
  if uid is null then return json_build_object('error','auth'); end if;
  update sanct_users set candle_credits = candle_credits-1, candles=candles+1 where id=uid and candle_credits > 0;
  if not found then return json_build_object('error','no_credit'); end if;
  insert into sanct_candles(ip_hash,user_id) values (sanct_ip_hash(),uid);
  return json_build_object('ok',true,'kind','candle','candles24',(select count(*) from sanct_candles where created_at > now()-interval '24 hours'),'credits',(select candle_credits from sanct_users where id=uid));
end $$;

create or replace function sanct_track(p_kind text, p_ref text, p_channel text, p_target text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare h text := sanct_ip_hash(); r text := nullif(left(btrim(coalesce(p_ref,'')),12),'');
begin
  if p_kind not in ('visit','share') then return false; end if;
  if (select count(*) from sanct_events where ip_hash=h and created_at > now()-interval '1 hour') >= 60 then return false; end if;
  if p_kind='visit' then
    if r is null or not exists (select 1 from sanct_users where ref_code=r) then return false; end if;
    if exists (select 1 from sanct_events where kind='visit' and ref_code=r and ip_hash=h and created_at > now()-interval '24 hours') then return false; end if;
  end if;
  insert into sanct_events(kind,ref_code,channel,target,ip_hash) values (p_kind, r, left(p_channel,20), left(p_target,40), h);
  return true;
end $$;

create or replace function sanct_list_rooms() returns table(id uuid, topic text, host_name text, starts_at timestamptz, duration_min integer)
language sql stable security definer set search_path to 'public' as $$
  select r.id, r.topic, r.host_name, r.starts_at, r.duration_min from sanct_rooms r
  where r.status='active' and r.starts_at + make_interval(mins=>r.duration_min) > now() and r.starts_at < now() + interval '24 hours'
  order by r.starts_at limit 30;
$$;

create or replace function sanct_get_room(p_id uuid) returns json
language sql stable security definer set search_path to 'public' as $$
  select json_build_object('id',r.id,'topic',r.topic,'host_name',r.host_name,'starts_at',r.starts_at,'duration_min',r.duration_min)
  from sanct_rooms r where r.id=p_id and r.status='active' and r.starts_at + make_interval(mins=>r.duration_min) > now();
$$;

create or replace function sanct_file_report(p_type text, p_target text, p_label text, p_reason text, p_details text, p_contact text, p_token text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare h text := sanct_ip_hash(); tid text := nullif(left(btrim(coalesce(p_target,'')),64),''); n int; uid uuid := sanct_uid(p_token);
begin
  if p_type not in ('prayer','room','user','other') then return json_build_object('error','bad_type'); end if;
  if p_reason not in ('spam','abuse','hate','sexual','violence','scam','illegal','copyright','privacy','other') then return json_build_object('error','bad_reason'); end if;
  if p_type <> 'other' and tid is null then return json_build_object('error','bad_target'); end if;
  if p_type = 'other' and char_length(btrim(coalesce(p_details,''))) < 10 then return json_build_object('error','need_details'); end if;
  if (select count(*) from sanct_reports where ip_hash=h and created_at > now()-interval '1 hour') >= 10 then return json_build_object('error','rate_limited'); end if;
  if tid is not null and exists (select 1 from sanct_reports where ip_hash=h and target_type=p_type and target_id=tid) then
    return json_build_object('ok',true,'dup',true);
  end if;
  insert into sanct_reports(target_type,target_id,target_label,reason,details,contact,ip_hash,reporter_id)
    values (p_type, tid, left(p_label,140), p_reason, left(p_details,2000), left(p_contact,200), h, uid);
  if tid is not null then
    select count(distinct ip_hash) into n from sanct_reports where target_type=p_type and target_id=tid and status='open';
    if p_type='prayer' then
      begin update sanct_prayers set report_count = greatest(report_count, n), status = case when n >= 3 then 'hidden' else status end where id = tid::uuid;
      exception when others then null; end;
    elsif p_type='room' then
      begin update sanct_rooms set report_count = n, status = case when n >= 3 then 'hidden' else status end where id = tid::uuid;
      exception when others then null; end;
    elsif p_type='user' then
      update sanct_users set name_locked = true where pub_id = tid and n >= 3;
    end if;
  end if;
  return json_build_object('ok',true);
end $$;

create or replace function sanct_report(p_id uuid) returns boolean
language plpgsql security definer set search_path to 'public' as $$
begin
  perform sanct_file_report('prayer', p_id::text, (select left(body,140) from sanct_prayers where id=p_id), 'other', null, null, null);
  return true;
end $$;

create or replace function sanct_admin_reports(p_key text, p_status text)
returns table(id uuid, target_type text, target_id text, target_label text, reason text, details text, contact text, status text, action text, created_at timestamptz, same_target integer, target_state text)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if p_key is distinct from (select v from sanct_config where k='admin_key') then raise exception 'forbidden'; end if;
  return query select r.id, r.target_type, r.target_id, r.target_label, r.reason, r.details, r.contact, r.status, r.action, r.created_at,
    (select count(*)::int from sanct_reports x where x.target_type=r.target_type and x.target_id=r.target_id),
    case r.target_type
      when 'prayer' then (select p.status from sanct_prayers p where p.id::text=r.target_id)
      when 'room' then (select o.status from sanct_rooms o where o.id::text=r.target_id)
      when 'user' then (select case when u.status='banned' then 'banned' when u.name_locked then 'name_hidden' else 'active' end from sanct_users u where u.pub_id=r.target_id)
    end
  from sanct_reports r where (p_status='all' or r.status=p_status) order by r.created_at desc limit 300;
end $$;

create or replace function sanct_admin_resolve(p_key text, p_id uuid, p_action text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare r record; uid uuid;
begin
  if p_key is distinct from (select v from sanct_config where k='admin_key') then raise exception 'forbidden'; end if;
  select * into r from sanct_reports where id=p_id;
  if r.id is null then return json_build_object('error','not_found'); end if;
  if p_action not in ('takedown','restore','ban','dismiss') then return json_build_object('error','bad_action'); end if;
  if r.target_id is not null then
    if r.target_type='prayer' then
      update sanct_prayers set status = case when p_action in ('takedown','ban') then 'hidden' else 'approved' end,
        report_count = case when p_action in ('restore','dismiss') then 0 else report_count end where id::text=r.target_id;
    elsif r.target_type='room' then
      update sanct_rooms set status = case when p_action in ('takedown','ban') then 'hidden' else 'active' end where id::text=r.target_id;
      if p_action='ban' then select host_id into uid from sanct_rooms where id::text=r.target_id; end if;
    elsif r.target_type='user' then
      select id into uid from sanct_users where pub_id=r.target_id;
      if p_action='takedown' then update sanct_users set name_locked=true where id=uid;
      elsif p_action in ('restore','dismiss') then update sanct_users set name_locked=false where id=uid; end if;
    end if;
    if p_action='ban' and uid is not null then
      update sanct_users set status='banned', name_locked=true where id=uid;
      update sanct_sessions set expires_at=now() where user_id=uid;
      update sanct_rooms set status='hidden' where host_id=uid;
    end if;
    update sanct_reports set status = case when p_action='dismiss' then 'dismissed' else 'resolved' end, action=p_action, resolved_at=now()
      where target_type=r.target_type and target_id=r.target_id and status='open';
  end if;
  update sanct_reports set status = case when p_action='dismiss' then 'dismissed' else 'resolved' end, action=p_action, resolved_at=now() where id=p_id;
  return json_build_object('ok',true);
end $$;
