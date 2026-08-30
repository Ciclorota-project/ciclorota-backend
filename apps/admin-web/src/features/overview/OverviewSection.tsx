import type { AdminCertificateRecord, AdminOverviewResponse, AdminUserRecord } from '@ciclorota/shared';
import { Award, CheckCircle2, MapPin, RefreshCw, Users } from 'lucide-react';
import { EmptyState, MetricCard, ScrollableList } from '../../components/admin-ui';
import { Button, Card, CardHeader } from '../../components/ui';
import { formatDateTime } from '../../lib/format';

export function OverviewSection(props: {
  overview: AdminOverviewResponse | null;
  loadingOverview: boolean;
  topUsers: AdminUserRecord[];
  recentCertificates: AdminCertificateRecord[];
  onSelectUser: (user: AdminUserRecord) => void;
  onRefreshOverview: () => void;
}) {
  const totalCheckpoints = props.overview?.summary.checkpoints || 0;

  const sortedRiders = (props.overview?.users ?? [])
    .filter((user) => user.role === 'user')
    .sort((a, b) => b.total_checkins - a.total_checkins)
    .slice(0, 5);

  const latestCheckins = (props.overview?.recent_checkins ?? []).slice(0, 5);
  const latestCertificates = props.recentCertificates.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Overview</h1>
        <Button variant="secondary" type="button" onClick={props.onRefreshOverview} disabled={props.loadingOverview}>
          <RefreshCw size={16} className={props.loadingOverview ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total de Usuários" value={props.overview?.summary.users ?? 0} icon={Users} accent />
        <MetricCard
          label="Checkpoints Ativos"
          value={props.overview?.summary.checkpoints ?? 0}
          icon={MapPin}
          description="Rotas catalogadas"
        />
        <MetricCard label="Check-ins Totais" value={props.overview?.summary.checkins ?? 0} icon={CheckCircle2} />
        <MetricCard label="Certificados Emitidos" value={props.overview?.summary.certificates ?? 0} icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            eyebrow="Classificação"
            title="Líderes da Rota"
            meta={props.loadingOverview ? 'Sincronizando...' : `${sortedRiders.length} ativos`}
          />
          <div className="p-4">
            <ScrollableList>
              {sortedRiders.map((user, index) => {
                const rank = index + 1;
                const progressPercent =
                  totalCheckpoints > 0 ? Math.min(100, Math.round((user.total_checkins / totalCheckpoints) * 100)) : 0;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => props.onSelectUser(user)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-left transition-colors hover:border-emerald-500/40"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        rank === 1
                          ? 'bg-amber-500/15 text-amber-400'
                          : rank <= 3
                            ? 'bg-zinc-800 text-zinc-200'
                            : 'bg-zinc-800/60 text-zinc-500'
                      }`}
                    >
                      {rank}
                    </span>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                      {(user.full_name ?? user.email ?? 'CR').slice(0, 2).toUpperCase()}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-100">
                        {user.full_name || 'Sem nome cadastrado'}
                      </span>
                      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {user.total_checkins}/{totalCheckpoints} checkpoints ({progressPercent}%)
                      </span>
                    </span>

                    {user.has_certificate ? (
                      <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        Elite
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {sortedRiders.length === 0 ? (
                <EmptyState title="Nenhum ciclista ativo" message="Aguardando registros de check-ins no aplicativo." />
              ) : null}
            </ScrollableList>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Atividade" title="Check-ins Recentes" meta={`${props.overview?.recent_checkins.length ?? 0} total`} />
          <div className="p-4">
            <ScrollableList>
              {latestCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                    <MapPin size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">{checkin.checkpoint_name}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      {checkin.full_name || checkin.user_email || checkin.user_id}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{formatDateTime(checkin.scanned_at)}</span>
                </div>
              ))}

              {latestCheckins.length === 0 ? (
                <EmptyState title="Sem atividade recente" message="Os novos check-ins realizados aparecerão aqui em tempo real." />
              ) : null}
            </ScrollableList>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Emitidos" title="Certificados Emitidos" meta={`${props.recentCertificates.length} total`} />
          <div className="p-4">
            <ScrollableList>
              {latestCertificates.map((certificate) => (
                <div
                  key={`${certificate.user_id}-${certificate.issued_at}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Award size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {certificate.full_name || certificate.email || certificate.user_id}
                    </span>
                    <span className="block text-xs text-zinc-500">{formatDateTime(certificate.issued_at)}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    Válido
                  </span>
                </div>
              ))}

              {latestCertificates.length === 0 ? (
                <EmptyState
                  title="Nenhum certificado emitido"
                  message="A API emitirá o certificado automaticamente assim que a rota for completada."
                />
              ) : null}
            </ScrollableList>
          </div>
        </Card>
      </div>
    </div>
  );
}
