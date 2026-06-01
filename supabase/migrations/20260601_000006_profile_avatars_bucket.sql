-- Bucket público para as fotos de perfil dos usuários.
-- Escrita feita só pelo backend via service role; leitura pública para
-- exibir avatares no app e nos rankings/líderes do painel admin.

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;
