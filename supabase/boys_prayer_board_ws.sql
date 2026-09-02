-- =====================================================================
-- Boys Prayer Board (Wednesday Bible Study) — Supabase schema
--
-- Run this ONCE in the Supabase SQL editor of project irujnmfbefjpztovqwjx.
-- It creates a completely separate set of objects, all suffixed _ws, and
-- does not touch `prayers`, `admin_config` or the existing admin_* RPCs.
--
--   tables : prayers_ws, admin_config_ws
--   RPCs   : admin_check_ws, admin_answered_ws, admin_edit2_ws,
--            admin_delete_ws, admin_swap_order_ws
--
-- BEFORE RUNNING: replace CHANGE-ME-PASSCODE (one place, near the bottom)
-- with the keeper passcode you want for this board.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Prayer requests
-- ---------------------------------------------------------------------
create table if not exists public.prayers_ws (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                    -- the "prayer point"
  text          text not null,                    -- the request itself
  category      text not null default 'Family',   -- Family/Friends/Nation/World/Thanksgiving
  added_by      text,
  answered      boolean not null default false,
  answered_date timestamptz,
  edited        timestamptz,
  created_at    timestamptz not null default now(),
  -- reading order inside a category; newest first, swapped by the admin arrows
  sort_order    double precision not null default extract(epoch from now())
);

alter table public.prayers_ws enable row level security;

-- Anyone with the link can read the board and add to it. Nothing else:
-- there is deliberately NO update or delete policy, so the only way to
-- change or remove a row is through the passcode-gated functions below.
drop policy if exists "prayers_ws public select" on public.prayers_ws;
create policy "prayers_ws public select"
  on public.prayers_ws for select
  to anon, authenticated
  using (true);

drop policy if exists "prayers_ws public insert" on public.prayers_ws;
create policy "prayers_ws public insert"
  on public.prayers_ws for insert
  to anon, authenticated
  with check (
    answered = false            -- new requests always start un-answered
    and answered_date is null
    and edited is null
    and length(name) between 1 and 200
    and length(text) between 1 and 2000
  );

grant select, insert on public.prayers_ws to anon, authenticated;
revoke update, delete on public.prayers_ws from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Admin config (holds the passcode hash)
-- ---------------------------------------------------------------------
create table if not exists public.admin_config_ws (
  key   text primary key,
  value text not null
);

-- RLS on with no policies = not readable or writable through the API at all.
alter table public.admin_config_ws enable row level security;
revoke all on public.admin_config_ws from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Admin functions (SECURITY DEFINER, gated by the passcode)
-- ---------------------------------------------------------------------
create or replace function public.admin_check_ws(pass text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select value = extensions.crypt(pass, value)
       from public.admin_config_ws
      where key = 'passcode_hash'),
    false);
$$;

create or replace function public.admin_answered_ws(pass text, pid uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.admin_check_ws(pass) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  update public.prayers_ws
     set answered = true, answered_date = now()
   where id = pid;
end;
$$;

create or replace function public.admin_edit2_ws(pass text, pid uuid, newpoint text, newtext text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.admin_check_ws(pass) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if newpoint is null or length(trim(newpoint)) = 0
     or newtext is null or length(trim(newtext)) = 0 then
    raise exception 'prayer point and request cannot be empty';
  end if;
  update public.prayers_ws
     set name = trim(newpoint), text = trim(newtext), edited = now()
   where id = pid;
end;
$$;

create or replace function public.admin_delete_ws(pass text, pid uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.admin_check_ws(pass) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  delete from public.prayers_ws where id = pid;
end;
$$;

create or replace function public.admin_swap_order_ws(pass text, pid1 uuid, pid2 uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s1 double precision;
  s2 double precision;
begin
  if not public.admin_check_ws(pass) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  select sort_order into s1 from public.prayers_ws where id = pid1;
  select sort_order into s2 from public.prayers_ws where id = pid2;
  if s1 is null or s2 is null then
    raise exception 'prayer not found';
  end if;
  update public.prayers_ws set sort_order = s2 where id = pid1;
  update public.prayers_ws set sort_order = s1 where id = pid2;
end;
$$;

-- Only the API roles may call these; nothing else needs to.
revoke all on function public.admin_check_ws(text)                          from public;
revoke all on function public.admin_answered_ws(text, uuid)                 from public;
revoke all on function public.admin_edit2_ws(text, uuid, text, text)        from public;
revoke all on function public.admin_delete_ws(text, uuid)                   from public;
revoke all on function public.admin_swap_order_ws(text, uuid, uuid)         from public;
grant execute on function public.admin_check_ws(text)                       to anon, authenticated;
grant execute on function public.admin_answered_ws(text, uuid)              to anon, authenticated;
grant execute on function public.admin_edit2_ws(text, uuid, text, text)     to anon, authenticated;
grant execute on function public.admin_delete_ws(text, uuid)                to anon, authenticated;
grant execute on function public.admin_swap_order_ws(text, uuid, uuid)      to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Set the keeper passcode  <<< EDIT THIS LINE >>>
-- ---------------------------------------------------------------------
-- Stored as a bcrypt hash; the plain passcode is never kept in the database.
-- Re-run just this statement any time you want to change the passcode.
insert into public.admin_config_ws (key, value)
values ('passcode_hash', extensions.crypt('CHANGE-ME-PASSCODE', extensions.gen_salt('bf')))
on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------
-- 5. Quick self-test (optional) — should return true
-- ---------------------------------------------------------------------
-- select public.admin_check_ws('CHANGE-ME-PASSCODE');
