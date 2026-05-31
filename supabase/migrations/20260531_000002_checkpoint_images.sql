-- Garante a função de updated_at — a baseline já cria, mas mantemos aqui
-- para a migration poder ser aplicada isoladamente em ambientes onde a
-- baseline ainda não rodou.
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.checkpoint_images (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references public.checkpoints (id) on delete cascade,
  url text not null,
  storage_path text not null,
  position integer not null default 0,
  width integer null,
  height integer null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint checkpoint_images_position_check check (position >= 0)
);

create index if not exists idx_checkpoint_images_checkpoint
  on public.checkpoint_images (checkpoint_id, position asc);

drop trigger if exists set_checkpoint_images_updated_at on public.checkpoint_images;
create trigger set_checkpoint_images_updated_at
before update on public.checkpoint_images
for each row
execute function public.set_current_timestamp_updated_at();

comment on table public.checkpoint_images is
  'Fotos em alta resolução (Full HD) de cada checkpoint, exibidas no carrossel do app.';

-- RLS habilitada sem policies: o backend usa service role (ignora RLS);
-- clientes anon/authenticated não acessam a tabela direto (leem via API).
alter table public.checkpoint_images enable row level security;

-- Bucket público para as fotos dos checkpoints.
-- Escrita é feita apenas pelo backend (service role, que ignora RLS);
-- leitura é pública para o app e o painel admin exibirem as imagens.
insert into storage.buckets (id, name, public)
values ('checkpoint-images', 'checkpoint-images', true)
on conflict (id) do nothing;
