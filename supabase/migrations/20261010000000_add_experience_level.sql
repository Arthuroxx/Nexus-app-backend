-- Nivel de experiencia del usuario, calculado por la encuesta de rutinas.
-- Idempotente: se puede ejecutar mas de una vez sin efectos secundarios.

alter table public.users
  add column if not exists experience_level text;

alter table public.users
  drop constraint if exists users_experience_level_check;

alter table public.users
  add constraint users_experience_level_check
  check (
    experience_level is null
    or experience_level in ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO')
  );
