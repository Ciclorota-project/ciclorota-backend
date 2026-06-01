# Supabase

Este diretório guarda o contrato esperado do banco para a API da Ciclorota.

## O que existe

- `migrations/20260408_000001_core_schema.sql`: baseline do schema principal usado pelo backend
- `migrations/20260531_000002_checkpoint_images.sql`: tabela `checkpoint_images` + bucket público `checkpoint-images` (carrossel de fotos do checkpoint)
- `migrations/20260601_000003_certificate_verification.sql`: coluna `verification_code` em `certificates` (PDF + QR de validação)
- `migrations/20260601_000004_checkpoint_qrcode_token.sql`: remove `checkpoints.qr_code` quando presente — QR Codes agora codificam o UUID `id` direto
- `migrations/20260601_000005_checkpoint_cascade.sql`: recria as FKs de `checkins` e `checkpoint_images` com `ON DELETE CASCADE`
- `migrations/20260601_000006_profile_avatars_bucket.sql`: bucket público `profile-avatars` para upload de foto de perfil

## Observação

Este baseline foi escrito a partir do contrato efetivamente consumido pela API neste repositório:
- `profiles`
- `checkpoints`
- `checkins`
- `certificates`

Se o projeto Supabase atual já estiver em produção, compare a estrutura existente antes de aplicar a migration em ambiente real.
