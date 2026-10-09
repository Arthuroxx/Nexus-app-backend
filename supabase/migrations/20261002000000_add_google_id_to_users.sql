-- Login con Google: vincula la cuenta de Google al usuario.
-- Idempotente: se puede ejecutar mas de una vez sin efectos secundarios.

alter table public.users add column if not exists google_id text;

-- Las cuentas creadas via Google no tienen contrasena.
alter table public.users alter column password_hash drop not null;

-- Indice unico parcial: permite multiples usuarios con google_id NULL.
create unique index if not exists users_google_id_key
  on public.users (google_id)
  where google_id is not null;
