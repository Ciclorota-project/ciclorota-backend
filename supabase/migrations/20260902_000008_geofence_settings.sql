-- Permite customizar a validação de geofence (Haversine) dos check-ins:
-- 1) raio individual por checkpoint (em metros), sobrepondo o padrão de 100m;
-- 2) uma chave global para desligar a validação em toda a rota via admin.

alter table public.checkpoints
  add column if not exists geofence_radius_meters double precision null;

alter table public.checkpoints
  drop constraint if exists checkpoints_geofence_radius_positive_check;

alter table public.checkpoints
  add constraint checkpoints_geofence_radius_positive_check
  check (geofence_radius_meters is null or geofence_radius_meters > 0);

comment on column public.checkpoints.geofence_radius_meters is
  'Raio customizado (metros) para validação de check-in. NULL usa o padrão de 100m.';

-- Tabela singleton (uma única linha, id fixo em true) para configurações
-- globais do app editáveis pelo painel admin.
create table if not exists public.app_settings (
  id boolean primary key default true,
  geofence_disabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_settings_singleton_check check (id = true)
);

comment on table public.app_settings is
  'Configurações globais do app (linha única). geofence_disabled desliga a validação de distância dos check-ins em toda a rota.';

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_current_timestamp_updated_at();

insert into public.app_settings (id, geofence_disabled)
values (true, false)
on conflict (id) do nothing;

-- RLS habilitada sem policies: o backend usa service role (ignora RLS);
-- clientes anon/authenticated não acessam a tabela direto (leem via API).
alter table public.app_settings enable row level security;
