
create type public.app_role as enum ('admin','point','network');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Phone OTPs (server-only access)
create table public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.phone_otps to service_role;
alter table public.phone_otps enable row level security;

-- Shipments
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  user_id uuid not null,
  service text not null default 'standard',
  sender_name text not null, sender_phone text not null, sender_address text not null, sender_pincode text not null, sender_city text not null,
  receiver_name text not null, receiver_phone text not null, receiver_address text not null, receiver_pincode text not null, receiver_city text not null,
  weight_kg numeric(8,2) not null,
  contents text,
  declared_value numeric(12,2) default 0,
  price numeric(12,2) not null,
  status text not null default 'booked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.shipments to authenticated;
grant all on public.shipments to service_role;
alter table public.shipments enable row level security;
create policy "own shipments read" on public.shipments for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'network') or public.has_role(auth.uid(),'point'));
create policy "own shipments insert" on public.shipments for insert to authenticated with check (auth.uid() = user_id);
create policy "staff shipments update" on public.shipments for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'network') or public.has_role(auth.uid(),'point'));

create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  location text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert on public.tracking_events to authenticated;
grant all on public.tracking_events to service_role;
alter table public.tracking_events enable row level security;
create policy "events read" on public.tracking_events for select to authenticated using (exists (select 1 from public.shipments s where s.id = shipment_id and (s.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'network') or public.has_role(auth.uid(),'point'))));
create policy "events insert" on public.tracking_events for insert to authenticated with check (exists (select 1 from public.shipments s where s.id = shipment_id and (s.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'network') or public.has_role(auth.uid(),'point'))));

-- Public tracking lookup (limited fields)
create or replace function public.track_shipment(_tracking text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tracking_number', s.tracking_number, 'status', s.status, 'service', s.service,
    'from_city', s.sender_city, 'to_city', s.receiver_city, 'created_at', s.created_at,
    'events', coalesce((select json_agg(json_build_object('status', e.status, 'location', e.location, 'note', e.note, 'at', e.created_at) order by e.created_at desc) from public.tracking_events e where e.shipment_id = s.id), '[]'::json))
  from public.shipments s where s.tracking_number = upper(trim(_tracking)) limit 1
$$;
grant execute on function public.track_shipment(text) to anon, authenticated;

-- Point partner applications
create table public.point_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('DBP' || to_char(now(),'YYMMDD') || upper(substr(md5(random()::text),1,5))),
  user_id uuid,
  full_name text not null,
  phone text not null,
  email text not null,
  business_name text not null,
  business_type text not null,
  city text not null,
  state text not null,
  pincode text not null,
  address text not null,
  space_sqft int,
  daily_capacity int,
  message text,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);
grant select, insert on public.point_applications to authenticated;
grant all on public.point_applications to service_role;
alter table public.point_applications enable row level security;
create policy "apply insert" on public.point_applications for insert to authenticated with check (auth.uid() = user_id);
create policy "apply read" on public.point_applications for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admin update apps" on public.point_applications for update to authenticated using (public.has_role(auth.uid(),'admin'));
grant update on public.point_applications to authenticated;

-- Health checks
create table public.health_checks (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  latency_ms int,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);
grant select on public.health_checks to authenticated;
grant all on public.health_checks to service_role;
alter table public.health_checks enable row level security;
create policy "admin health read" on public.health_checks for select to authenticated using (public.has_role(auth.uid(),'admin'));
