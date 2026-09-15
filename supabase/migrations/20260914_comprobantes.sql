-- Run this in the Supabase SQL editor after creating the "comprobantes" storage bucket.
alter table viajes_tonelaje add column if not exists ticket_url text;
alter table gastos add column if not exists comprobante_url text;
alter table gastos_tonelaje add column if not exists comprobante_url text;
alter table pagos add column if not exists comprobante_url text;
alter table pagos_tonelaje add column if not exists comprobante_url text;
