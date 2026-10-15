-- Nucleo de entrenamientos del usuario: ejercicios, rutinas, items y sesiones.
-- Idempotente: se puede ejecutar mas de una vez sin efectos secundarios.

-- Ejercicios del usuario ----------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  muscle_group text not null,
  default_sets integer not null default 3,
  default_reps integer not null default 10,
  default_load_kg numeric(6, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_muscle_group_check check (
    muscle_group in (
      'PECHO', 'ESPALDA', 'HOMBROS', 'BICEPS', 'TRICEPS', 'ANTEBRAZOS',
      'PIERNAS', 'GLUTEOS', 'CORE', 'CUERPO_COMPLETO'
    )
  ),
  constraint exercises_sets_check check (default_sets between 1 and 20),
  constraint exercises_reps_check check (default_reps between 1 and 100),
  constraint exercises_load_check check (default_load_kg is null or default_load_kg >= 0)
);

-- Nombre unico por usuario ignorando mayusculas.
create unique index if not exists exercises_user_name_key
  on public.exercises (user_id, lower(name));

create index if not exists exercises_user_id_idx
  on public.exercises (user_id, created_at);

-- Rutinas del usuario -------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  focus_tag text,
  intensity text not null default 'MEDIA',
  estimated_minutes integer not null default 45,
  scheduled_days smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routines_intensity_check check (intensity in ('BAJA', 'MEDIA', 'ALTA')),
  constraint routines_minutes_check check (estimated_minutes between 5 and 240)
);

create index if not exists routines_user_id_idx
  on public.routines (user_id, created_at);

-- Items de rutina -----------------------------------------------------------
create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position integer not null,
  sets integer not null default 3,
  reps integer not null default 10,
  load_kg numeric(6, 2),
  load_note text,
  constraint routine_items_sets_check check (sets between 1 and 20),
  constraint routine_items_reps_check check (reps between 1 and 100),
  constraint routine_items_load_check check (load_kg is null or load_kg >= 0)
);

create index if not exists routine_items_routine_id_idx
  on public.routine_items (routine_id, position);

create index if not exists routine_items_exercise_id_idx
  on public.routine_items (exercise_id);

-- Sesiones de entrenamiento (solo lectura por ahora) ------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_minutes integer,
  total_volume_kg numeric(10, 2),
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_idx
  on public.workout_sessions (user_id, started_at);

alter table public.exercises disable row level security;
alter table public.routines disable row level security;
alter table public.routine_items disable row level security;
alter table public.workout_sessions disable row level security;
