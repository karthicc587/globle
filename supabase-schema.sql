-- Multiplayer V1.1 schema for async turn-based rooms.
-- Includes "Quick Play" (Rematch) session chaining.

create extension if not exists pgcrypto;

-- ── ROOMS TABLE ────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id text primary key,
  created_by uuid not null default auth.uid(),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'expired')),
  mode text not null default 'globle' check (mode in ('globle', 'path')),
  path_start_iso3 text check (path_start_iso3 is null or char_length(path_start_iso3) = 3),
  target_iso3 text check (char_length(target_iso3) = 3),
  
  -- Pointer for Quick Play / Rematch feature
  next_room_id text references public.rooms(id), 
  
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- ── ROOM PLAYERS ───────────────────────────────────────────────────────────
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

-- ── ROOM GUESSES ───────────────────────────────────────────────────────────
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

-- ── ROOM RESULTS ───────────────────────────────────────────────────────────
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

-- ── ROW LEVEL SECURITY (RLS) ───────────────────────────────────────────────
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_guesses enable row level security;
alter table public.room_results enable row level security;

-- Security helper function
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

-- Policies
create policy "rooms_select_joined" on public.rooms for select using (public.is_room_member(id));
create policy "rooms_insert_owner" on public.rooms for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "rooms_update_member" on public.rooms for update using (public.is_room_member(id));

create policy "room_players_select_joined" on public.room_players for select using (public.is_room_member(room_id));
create policy "room_players_insert_self" on public.room_players for insert with check (player_id = auth.uid());
create policy "room_players_update_self" on public.room_players for update using (player_id = auth.uid());
create policy "room_players_delete_self" on public.room_players for delete using (player_id = auth.uid());

create policy "room_guesses_select_joined" on public.room_guesses for select using (public.is_room_member(room_id));
create policy "room_guesses_insert_self" on public.room_guesses for insert with check (player_id = auth.uid());

create policy "room_results_select_joined" on public.room_results for select using (public.is_room_member(room_id));
create policy "room_results_insert_self" on public.room_results for insert with check (player_id = auth.uid());

-- ── REALTIME CONFIGURATION ────────────────────────────────────────────────
-- Ensure all tables are part of the realtime publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.room_guesses;
alter publication supabase_realtime add table public.room_results;

-- ── Introduced a function to delete empty rooms after 24hrs ────────────────────────────────────────────────

-- 1. Create the function
create or replace function delete_expired_rooms()
returns void
language sql
security definer
as $$
  delete from public.rooms
  where expires_at < now();
$$;

-- 2. Schedule the function
select cron.schedule(
  'cleanup-expired-rooms-task', 
  '0 * * * *',                  
  'select delete_expired_rooms();'
);
-- Introduced collaborative mode
ALTER TABLE public.rooms 
ADD COLUMN is_collaborative BOOLEAN DEFAULT false,
ADD COLUMN current_turn_player_id UUID;