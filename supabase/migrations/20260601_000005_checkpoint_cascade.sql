-- Garante que dependências de checkpoints sumam quando o checkpoint é
-- excluído. A baseline já declarava `on delete cascade` mas o banco real
-- está divergente — esta migração recria as FKs de forma idempotente.

-- checkins.checkpoint_id -> checkpoints.id
alter table public.checkins
  drop constraint if exists checkins_checkpoint_id_fkey;

alter table public.checkins
  add constraint checkins_checkpoint_id_fkey
  foreign key (checkpoint_id)
  references public.checkpoints (id)
  on delete cascade;

-- checkpoint_images.checkpoint_id -> checkpoints.id
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'checkpoint_images'
  ) then
    alter table public.checkpoint_images
      drop constraint if exists checkpoint_images_checkpoint_id_fkey;

    alter table public.checkpoint_images
      add constraint checkpoint_images_checkpoint_id_fkey
      foreign key (checkpoint_id)
      references public.checkpoints (id)
      on delete cascade;
  end if;
end $$;
