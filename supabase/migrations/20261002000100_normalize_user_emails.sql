-- Normaliza los correos para que el login sea insensible a mayusculas.
-- Idempotente. Verificado beforehand: no hay duplicados case-insensitive,
-- por lo que el UPDATE no puede chocar con el indice unico de email.

update public.users set email = lower(email) where email <> lower(email);

-- Unicidad insensible a mayusculas a nivel de base de datos.
-- Impide duplicados aunque la aplicacion se equivoque.
create unique index if not exists users_email_lower_key
  on public.users (lower(email));
