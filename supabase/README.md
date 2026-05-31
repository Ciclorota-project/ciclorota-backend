# Supabase

Este diretório guarda o contrato esperado do banco para a API da Ciclorota.

## O que existe

- `migrations/20260408_000001_core_schema.sql`: baseline do schema principal usado pelo backend
- `migrations/20260531_000002_checkpoint_images.sql`: tabela `checkpoint_images` + bucket público `checkpoint-images` (carrossel de fotos do checkpoint)

## Observação

Este baseline foi escrito a partir do contrato efetivamente consumido pela API neste repositório:
- `profiles`
- `checkpoints`
- `checkins`
- `certificates`

Se o projeto Supabase atual já estiver em produção, compare a estrutura existente antes de aplicar a migration em ambiente real.
