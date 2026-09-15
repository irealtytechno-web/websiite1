-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id,email,display_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.staff_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','vp','agent')),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  property_type text not null check (property_type in ('Open Plot','Agriculture Land','Chance Property','Flat','Villa','Commercial')),
  city text not null check (city in ('Hyderabad','Bangalore','Delhi')),
  locality text,
  map_location text,
  area_value numeric(18,2), area_unit text default 'sq.ft',
  price_value numeric(18,2), price_unit text default 'total', bedrooms integer,
  description text, features text, image_urls jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','sold','draft')),
  agent_name text, agent_phone text, agent_email text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  allow_agent_contact boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select role from public.staff_roles where user_id = auth.uid()
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','vp','agent'), false)
$$;
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','vp'), false)
$$;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists inventory_updated_at on public.inventory;
create trigger inventory_updated_at before update on public.inventory for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.inventory enable row level security;
create policy "read own profile" on public.profiles for select using (id = auth.uid() or public.my_role() = 'admin');
create policy "staff see roles" on public.staff_roles for select using (user_id = auth.uid() or public.my_role() = 'admin');
create policy "staff read inventory" on public.inventory for select using (public.is_staff());
create policy "staff add inventory" on public.inventory for insert with check (public.is_staff() and created_by = auth.uid());
create policy "managers update inventory" on public.inventory for update using (public.is_manager()) with check (public.is_manager());
create policy "agents update own inventory" on public.inventory for update using (public.my_role() = 'agent' and created_by = auth.uid()) with check (created_by = auth.uid());
create policy "managers delete inventory" on public.inventory for delete using (public.is_manager());
create policy "agents delete own inventory" on public.inventory for delete using (public.my_role() = 'agent' and created_by = auth.uid());

-- Public listings deliberately exclude private agent email and hide phone unless approved.
create or replace view public.public_inventory with (security_invoker = false) as
select id,title,property_type,city,locality,map_location,area_value,area_unit,price_value,price_unit,bedrooms,description,
  image_urls->>0 as image_url,
  case when allow_agent_contact and coalesce(agent_phone,'') <> '' then agent_phone else '+916300181062' end as contact_phone,
  created_at
from public.inventory where status = 'active';
grant select on public.public_inventory to anon, authenticated;

create or replace function public.assign_staff(staff_email text, desired_role text)
returns void language plpgsql security definer set search_path = public as $$
declare staff_id uuid;
begin
  if public.my_role() <> 'admin' then raise exception 'Admin access required'; end if;
  if desired_role not in ('vp','agent') then raise exception 'Invalid role'; end if;
  select id into staff_id from public.profiles where email = lower(trim(staff_email));
  if staff_id is null then raise exception 'This user must create an account first'; end if;
  insert into public.staff_roles(user_id,role) values(staff_id,desired_role)
  on conflict(user_id) do update set role = excluded.role;
end;
$$;
create or replace function public.remove_staff(staff_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Admin access required'; end if;
  delete from public.staff_roles r using public.profiles p where r.user_id = p.id and p.email = lower(trim(staff_email)) and r.role <> 'admin';
end;
$$;
revoke all on function public.assign_staff(text,text), public.remove_staff(text) from public;
grant execute on function public.assign_staff(text,text), public.remove_staff(text) to authenticated;

-- Property photo storage: public read, staff-only upload.
insert into storage.buckets (id, name, public) values ('property-images', 'property-images', true)
on conflict (id) do update set public = true;
create policy "public property image access" on storage.objects for select using (bucket_id = 'property-images');
create policy "staff property image uploads" on storage.objects for insert to authenticated with check (bucket_id = 'property-images' and public.is_staff());
create policy "staff property image updates" on storage.objects for update to authenticated using (bucket_id = 'property-images' and public.is_staff());
create policy "staff property image deletes" on storage.objects for delete to authenticated using (bucket_id = 'property-images' and public.is_staff());

-- After creating your own account in /staff.html, run this ONCE, replacing the email.
-- insert into public.staff_roles(user_id, role)
-- select id, 'admin' from public.profiles where email = 'your-email@example.com'
-- on conflict (user_id) do update set role = 'admin';
