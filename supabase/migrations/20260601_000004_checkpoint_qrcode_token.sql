-- O QR Code de cada checkpoint agora codifica diretamente o UUID `id`
-- do checkpoint. A coluna `qr_code` (declarada na baseline mas que ficou
-- divergente entre ambientes) é removida quando existir, junto com a
-- constraint e o índice associados.

alter table public.checkpoints
  drop constraint if exists checkpoints_qr_code_unique;

drop index if exists public.idx_checkpoints_qr_code;

alter table public.checkpoints
  drop column if exists qr_code;
