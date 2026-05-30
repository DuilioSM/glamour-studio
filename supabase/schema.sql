-- ============================================================
-- Glamour Studio — esquema de base de datos + storage + RLS
-- Pégalo completo en Supabase → SQL Editor → Run.
-- ============================================================

-- ---------- Tablas ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  avatar_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  category text not null default 'other',
  name text not null default 'Prenda',
  created_at timestamptz not null default now()
);

create table if not exists public.looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  garment_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists garments_user_idx on public.garments (user_id, created_at);
create index if not exists looks_user_idx on public.looks (user_id, created_at desc);

-- ---------- RLS en tablas ----------
alter table public.profiles enable row level security;
alter table public.garments enable row level security;
alter table public.looks enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "garments_own" on public.garments;
create policy "garments_own" on public.garments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "looks_own" on public.looks;
create policy "looks_own" on public.looks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

-- Cada usuario solo accede a archivos bajo la carpeta {user_id}/...
drop policy if exists "wardrobe_select_own" on storage.objects;
create policy "wardrobe_select_own" on storage.objects
  for select using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wardrobe_insert_own" on storage.objects;
create policy "wardrobe_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wardrobe_update_own" on storage.objects;
create policy "wardrobe_update_own" on storage.objects
  for update using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "wardrobe_delete_own" on storage.objects;
create policy "wardrobe_delete_own" on storage.objects
  for delete using (
    bucket_id = 'wardrobe'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
