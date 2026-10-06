-- PVR QR Analytics Portal: initial database schema.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------------------
-- Admins: only users listed here can see or change anything.
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id bigint generated always as identity primary key,
  name text not null unique check (length(trim(name)) > 0),
  description text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- Locations (PVR cinemas)
-- ---------------------------------------------------------------------------
create table public.locations (
  id bigint generated always as identity primary key,
  name text not null unique check (length(trim(name)) > 0),
  city text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- QR codes
-- ---------------------------------------------------------------------------
create table public.qr_codes (
  id bigint generated always as identity primary key,
  short_code text not null unique check (short_code ~ '^[A-Za-z0-9]{4,32}$'),
  campaign_id bigint not null references public.campaigns (id) on delete restrict,
  location_id bigint not null references public.locations (id) on delete restrict,
  source text not null check (length(trim(source)) > 0),
  destination_url text not null check (destination_url ~ '^https://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index qr_codes_campaign_idx on public.qr_codes (campaign_id);
create index qr_codes_location_idx on public.qr_codes (location_id);

-- ---------------------------------------------------------------------------
-- Destination history: one row every time a destination link changes.
-- ---------------------------------------------------------------------------
create table public.destination_history (
  id bigint generated always as identity primary key,
  qr_code_id bigint not null references public.qr_codes (id) on delete cascade,
  old_url text,
  new_url text not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index destination_history_qr_idx on public.destination_history (qr_code_id, changed_at desc);

create or replace function public.qr_codes_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.destination_url is distinct from old.destination_url then
    insert into public.destination_history (qr_code_id, old_url, new_url, changed_by)
    values (old.id, old.destination_url, new.destination_url, auth.uid());
  end if;
  return new;
end;
$$;

create trigger qr_codes_before_update
before update on public.qr_codes
for each row execute function public.qr_codes_before_update();

-- ---------------------------------------------------------------------------
-- Scans: one row per scan. No names, phone numbers or IP addresses are kept.
-- ---------------------------------------------------------------------------
create table public.scans (
  id bigint generated always as identity primary key,
  qr_code_id bigint not null references public.qr_codes (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  country text,
  region text,
  city text,
  device_type text not null default 'unknown'
    check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  os text,
  browser text,
  visitor_id uuid,
  is_bot boolean not null default false
);

create index scans_qr_time_idx on public.scans (qr_code_id, scanned_at);
create index scans_time_idx on public.scans (scanned_at);

-- ---------------------------------------------------------------------------
-- Row Level Security: nobody can read or write unless they are an admin.
-- The public scan link uses the server-only secret key, which bypasses these
-- rules, so visitors never need (or get) direct database access.
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.campaigns enable row level security;
alter table public.locations enable row level security;
alter table public.qr_codes enable row level security;
alter table public.destination_history enable row level security;
alter table public.scans enable row level security;

create policy "admins can see admin list" on public.admins
  for select to authenticated using (public.is_admin());

create policy "admins manage campaigns" on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins manage locations" on public.locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins manage qr codes" on public.qr_codes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins read destination history" on public.destination_history
  for select to authenticated using (public.is_admin());

create policy "admins read scans" on public.scans
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Filtered scans (shared by the dashboard and the CSV export).
-- Dates are India Standard Time. Robot visits are left out.
-- ---------------------------------------------------------------------------
create or replace function public.filtered_scans(
  p_from date default null,
  p_to date default null,
  p_location_id bigint default null,
  p_campaign_id bigint default null
)
returns table (
  scan_id bigint,
  scanned_at timestamptz,
  scan_date date,
  qr_code_id bigint,
  short_code text,
  source text,
  campaign_id bigint,
  campaign_name text,
  location_id bigint,
  location_name text,
  country text,
  region text,
  city text,
  device_type text,
  os text,
  browser text,
  visitor_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.scanned_at,
    (s.scanned_at at time zone 'Asia/Kolkata')::date,
    q.id,
    q.short_code,
    q.source,
    c.id,
    c.name,
    l.id,
    l.name,
    s.country,
    s.region,
    s.city,
    s.device_type,
    s.os,
    s.browser,
    s.visitor_id
  from public.scans s
  join public.qr_codes q on q.id = s.qr_code_id
  join public.campaigns c on c.id = q.campaign_id
  join public.locations l on l.id = q.location_id
  where not s.is_bot
    and (p_from is null or s.scanned_at >= (p_from::timestamp at time zone 'Asia/Kolkata'))
    and (p_to is null or s.scanned_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata'))
    and (p_location_id is null or q.location_id = p_location_id)
    and (p_campaign_id is null or q.campaign_id = p_campaign_id);
$$;

-- ---------------------------------------------------------------------------
-- Dashboard numbers in one call.
-- Unique scans = distinct phones (anonymous visitor tag); a scan without a tag
-- counts as its own visitor.
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats(
  p_from date default null,
  p_to date default null,
  p_location_id bigint default null,
  p_campaign_id bigint default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with f as (
    select *, coalesce(visitor_id::text, 'scan-' || scan_id) as visitor_key
    from public.filtered_scans(p_from, p_to, p_location_id, p_campaign_id)
  )
  select jsonb_build_object(
    'total_scans', (select count(*) from f),
    'unique_scans', (select count(distinct visitor_key) from f),
    'scans_today', (
      select count(*) from f
      where scan_date = (now() at time zone 'Asia/Kolkata')::date
    ),
    'by_location', coalesce((
      select jsonb_agg(jsonb_build_object('label', location_name, 'value', n) order by n desc)
      from (select location_name, count(*) as n from f group by location_name) t
    ), '[]'::jsonb),
    'by_date', coalesce((
      select jsonb_agg(jsonb_build_object('date', scan_date, 'value', n) order by scan_date)
      from (select scan_date, count(*) as n from f group by scan_date) t
    ), '[]'::jsonb),
    'by_device', coalesce((
      select jsonb_agg(jsonb_build_object('label', device_type, 'value', n) order by n desc)
      from (select device_type, count(*) as n from f group by device_type) t
    ), '[]'::jsonb),
    'by_os', coalesce((
      select jsonb_agg(jsonb_build_object('label', coalesce(os, 'Unknown'), 'value', n) order by n desc)
      from (select os, count(*) as n from f group by os) t
    ), '[]'::jsonb),
    'by_browser', coalesce((
      select jsonb_agg(jsonb_build_object('label', coalesce(browser, 'Unknown'), 'value', n) order by n desc)
      from (select browser, count(*) as n from f group by browser) t
    ), '[]'::jsonb)
  );
$$;

-- Scan totals per QR code, for the QR code list page.
create or replace function public.qr_scan_counts()
returns table (qr_code_id bigint, total_scans bigint, last_scan_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select qr_code_id, count(*), max(scanned_at)
  from public.scans
  where not is_bot
  group by qr_code_id;
$$;

revoke execute on function public.filtered_scans(date, date, bigint, bigint) from public, anon;
revoke execute on function public.dashboard_stats(date, date, bigint, bigint) from public, anon;
revoke execute on function public.qr_scan_counts() from public, anon;
grant execute on function public.filtered_scans(date, date, bigint, bigint) to authenticated;
grant execute on function public.dashboard_stats(date, date, bigint, bigint) to authenticated;
grant execute on function public.qr_scan_counts() to authenticated;
