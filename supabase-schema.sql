-- Multiplayer V1 schema for async turn-based rooms.
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id text primary key,
  created_by uuid not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'expired')),
  mode text not null default 'globle' check (mode in ('globle', 'path')),
  path_start_iso3 text check (path_start_iso3 is null or char_length(path_start_iso3) = 3),
  target_iso3 text check (char_length(target_iso3) = 3),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.rooms alter column created_by set default auth.uid();
alter table public.rooms add column if not exists path_start_iso3 text;
alter table public.rooms
  drop constraint if exists rooms_mode_check,
  add constraint rooms_mode_check check (mode in ('globle', 'path'));
alter table public.rooms
  drop constraint if exists rooms_path_start_iso3_check,
  add constraint rooms_path_start_iso3_check check (path_start_iso3 is null or char_length(path_start_iso3) = 3);

create table if not exists public.room_players (
  room_id text not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  is_ready boolean not null default false,
  gave_up boolean not null default false,
  finished_at timestamptz,
  primary key (room_id, player_id)
);

create table if not exists public.room_guesses (
  room_id text not null,
  player_id uuid not null,
  guess_index int not null check (guess_index > 0),
  iso3 text not null check (char_length(iso3) = 3),
  distance_km numeric not null check (distance_km >= 0),
  created_at timestamptz not null default now(),
  primary key (room_id, player_id, guess_index),
  foreign key (room_id, player_id) references public.room_players(room_id, player_id) on delete cascade
);

create table if not exists public.room_results (
  room_id text not null,
  player_id uuid not null,
  guess_count int not null check (guess_count >= 0),
  duration_ms bigint not null check (duration_ms >= 0),
  won boolean not null,
  gave_up boolean not null default false,
  completed_at timestamptz not null default now(),
  primary key (room_id, player_id),
  foreign key (room_id, player_id) references public.room_players(room_id, player_id) on delete cascade
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_guesses enable row level security;
alter table public.room_results enable row level security;

-- Avoid RLS recursion by checking membership through a SECURITY DEFINER function.
create or replace function public.is_room_member(target_room_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_players rp
    where rp.room_id = target_room_id
      and rp.player_id = auth.uid()
  );
$$;

grant execute on function public.is_room_member(text) to anon, authenticated;

-- Room visibility: only joined players can read room and game data.
drop policy if exists "rooms_select_joined" on public.rooms;
create policy "rooms_select_joined" on public.rooms
for select using (public.is_room_member(id));

drop policy if exists "rooms_insert_owner" on public.rooms;
create policy "rooms_insert_owner" on public.rooms
for insert with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists "rooms_update_owner" on public.rooms;
create policy "rooms_update_owner" on public.rooms
for update using (created_by = auth.uid());

drop policy if exists "room_players_select_joined" on public.room_players;
create policy "room_players_select_joined" on public.room_players
for select using (public.is_room_member(room_id));

drop policy if exists "room_players_insert_self" on public.room_players;
create policy "room_players_insert_self" on public.room_players
for insert with check (player_id = auth.uid());

drop policy if exists "room_players_update_self" on public.room_players;
create policy "room_players_update_self" on public.room_players
for update using (player_id = auth.uid());

drop policy if exists "room_guesses_select_joined" on public.room_guesses;
create policy "room_guesses_select_joined" on public.room_guesses
for select using (public.is_room_member(room_id));

drop policy if exists "room_guesses_insert_self" on public.room_guesses;
create policy "room_guesses_insert_self" on public.room_guesses
for insert with check (
  player_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_guesses.room_id
      and r.status = 'active'
      and (r.expires_at is null or r.expires_at > now())
  )
);

drop policy if exists "room_results_select_joined" on public.room_results;
create policy "room_results_select_joined" on public.room_results
for select using (public.is_room_member(room_id));

drop policy if exists "room_results_insert_self" on public.room_results;
create policy "room_results_insert_self" on public.room_results
for insert with check (player_id = auth.uid());

-- Realtime publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
  ) then
    alter publication supabase_realtime add table public.room_players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_guesses'
  ) then
    alter publication supabase_realtime add table public.room_guesses;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_results'
  ) then
    alter publication supabase_realtime add table public.room_results;
  end if;
end $$;
