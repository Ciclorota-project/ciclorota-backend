-- Adiciona o código de verificação único de cada certificado.
-- O código é o "segredo público" impresso no PDF e dentro do QR:
-- qualquer pessoa pode escanear, e o backend confirma autenticidade.

alter table public.certificates
  add column if not exists verification_code text;

-- Backfill para certificados já emitidos: 12 chars hex em maiúsculas
-- (gen_random_uuid() depende da extensão pgcrypto, criada na baseline).
update public.certificates
set verification_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where verification_code is null;

alter table public.certificates
  alter column verification_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'certificates_verification_code_unique'
  ) then
    alter table public.certificates
      add constraint certificates_verification_code_unique unique (verification_code);
  end if;
end $$;

create index if not exists idx_certificates_verification_code
  on public.certificates (verification_code);

comment on column public.certificates.verification_code is
  'Código alfanumérico (12 chars) impresso no PDF e dentro do QR. Único por certificado.';
