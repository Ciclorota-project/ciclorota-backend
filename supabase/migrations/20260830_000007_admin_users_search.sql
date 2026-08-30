-- Corrige o gargalo de escalabilidade de /admin/users: antes, AdminService
-- carregava TODA a base de auth.users (+ todos os check-ins + todos os
-- certificados) na memória do Node a cada request — inclusive a cada tecla
-- digitada numa busca — e só então filtrava/paginava em JavaScript.
--
-- Estas funções SECURITY DEFINER rodam a busca, o filtro por role e a
-- paginação direto no Postgres. Ficam no schema public (auth.users não é
-- exposto via PostgREST, mas uma função pode acessar qualquer schema) e só
-- podem ser chamadas pelo service_role (usado exclusivamente pelo backend).

create extension if not exists pg_trgm;

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

-- Busca/pagina usuários. Replica exatamente a precedência de role de
-- resolveRoleFromMetadata (apps/api/src/config/admin.ts): app_metadata.role
-- válido > user_metadata.role válido > 'user'. A busca cobre id (uuid),
-- e-mail, nome e role por substring — igual ao comportamento anterior.
-- p_search_pattern já vem pronto do Node (trim + escape de %/_/\ aplicados
-- por escapeIlikePattern, ver apps/api/src/utils/adminUsers.ts), incluindo
-- os '%' de contorno — ou null quando não há busca. Mantém o escape num
-- único lugar (testável isoladamente) em vez de duplicar a lógica em SQL.
create or replace function public.admin_list_users(
  p_search_pattern text,
  p_role text,
  p_limit int,
  p_offset int
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with params as (
    select p_search_pattern as search_pattern
  ),
  base as materialized (
    select
      u.id,
      coalesce(u.email, u.raw_user_meta_data ->> 'email') as email,
      u.created_at,
      case
        when u.raw_app_meta_data ->> 'role' in ('user', 'admin', 'superadmin') then u.raw_app_meta_data ->> 'role'
        when u.raw_user_meta_data ->> 'role' in ('user', 'admin', 'superadmin') then u.raw_user_meta_data ->> 'role'
        else 'user'
      end as role,
      p.full_name,
      p.avatar_url
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.deleted_at is null
  ),
  filtered as materialized (
    select base.*
    from base, params
    where (p_role is null or base.role = p_role)
      and (
        params.search_pattern is null
        or base.id::text ilike params.search_pattern escape '\'
        or coalesce(base.email, '') ilike params.search_pattern escape '\'
        or coalesce(base.full_name, '') ilike params.search_pattern escape '\'
        or base.role ilike params.search_pattern escape '\'
      )
  ),
  paged as materialized (
    select *
    from filtered
    order by created_at desc, id desc
    limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pg.id,
            'email', pg.email,
            'created_at', pg.created_at,
            'role', pg.role,
            'full_name', pg.full_name,
            'avatar_url', pg.avatar_url,
            'total_checkins', (select count(*) from public.checkins c where c.user_id = pg.id),
            'certificate_issued_at', (select cert.issued_at from public.certificates cert where cert.user_id = pg.id)
          )
          order by pg.created_at desc, pg.id desc
        )
        from paged pg
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.admin_list_users(text, text, int, int) from public;
grant execute on function public.admin_list_users(text, text, int, int) to service_role;
comment on function public.admin_list_users(text, text, int, int) is
  'p_search_pattern deve chegar já escapado (ver escapeIlikePattern em apps/api).';

-- Busca leve por lista de ids (sem paginação — a lista de entrada já é
-- limitada pelo chamador). Substitui duas implementações divergentes:
-- AdminService.listAuthUsersByIds (correta, mas varria a base inteira) e
-- CertificateService.listAuthUsersByIds (buscava só a 1ª página da Admin
-- Auth API, perdendo e-mail de usuários cadastrados depois).
create or replace function public.admin_users_by_ids(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', coalesce(u.email, u.raw_user_meta_data ->> 'email'),
        'created_at', u.created_at,
        'role', case
          when u.raw_app_meta_data ->> 'role' in ('user', 'admin', 'superadmin') then u.raw_app_meta_data ->> 'role'
          when u.raw_user_meta_data ->> 'role' in ('user', 'admin', 'superadmin') then u.raw_user_meta_data ->> 'role'
          else 'user'
        end
      )
    ),
    '[]'::jsonb
  )
  from auth.users u
  where u.id = any(p_ids)
    and u.deleted_at is null;
$$;

revoke all on function public.admin_users_by_ids(uuid[]) from public;
grant execute on function public.admin_users_by_ids(uuid[]) to service_role;
