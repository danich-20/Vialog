-- Pagos de comisión a los choferes.
-- Son montos globales: un pago puede cubrir varios viajes, por eso van en su
-- propia tabla y no como una casilla dentro del viaje.
-- Ejecutar en el editor SQL de Supabase.

create table if not exists pagos_comision (
  id              text primary key,
  user_id         uuid references auth.users(id),
  conductor_id    text,
  fecha           date,
  monto_usd       numeric default 0,
  monto_bs        numeric default 0,
  tasa            numeric default 0,
  metodo          text,
  referencia      text,
  comprobante_url text
);

create table if not exists pagos_comision_tonelaje (
  id              text primary key,
  user_id         uuid references auth.users(id),
  conductor_id    text,
  fecha           date,
  monto_usd       numeric default 0,
  monto_bs        numeric default 0,
  tasa            numeric default 0,
  metodo          text,
  referencia      text,
  comprobante_url text
);

create index if not exists idx_pagos_comision_conductor
  on pagos_comision (conductor_id);
create index if not exists idx_pagos_comision_tonelaje_conductor
  on pagos_comision_tonelaje (conductor_id);

-- Seguridad: cada usuario solo ve y escribe sus propias filas.
-- OJO: revisa que coincida con lo que hacen tus otras tablas antes de ejecutar.
-- Para verlo:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Si tus otras tablas NO tienen RLS y entran varias personas con logins
-- distintos que deben ver los mismos datos, avísame y ajustamos esto.

alter table pagos_comision enable row level security;
alter table pagos_comision_tonelaje enable row level security;

create policy "pagos_comision propios" on pagos_comision
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "pagos_comision_tonelaje propios" on pagos_comision_tonelaje
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
