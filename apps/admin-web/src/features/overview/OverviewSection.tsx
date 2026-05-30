import type { AdminCertificateRecord, AdminOverviewResponse, AdminUserRecord } from '@ciclorota/shared';
import { EmptyState } from '../../components/admin-ui';
import { formatDateTime } from '../../lib/format';

export function OverviewSection(props: {
  overview: AdminOverviewResponse | null;
  loadingOverview: boolean;
  topUsers: AdminUserRecord[];
  recentCertificates: AdminCertificateRecord[];
  onSelectUser: (user: AdminUserRecord) => void;
}) {
  const totalCheckpoints = props.overview?.summary.checkpoints || 0;

  // 1. Filtrar e ordenar ciclistas para mostrar apenas role === 'user' ordenado por check-ins
  const sortedRiders = (props.overview?.users ?? [])
    .filter((user) => user.role === 'user')
    .sort((a, b) => b.total_checkins - a.total_checkins)
    .slice(0, 5); // Limitar aos top 5 ciclistas

  // 2. Limitar check-ins aos últimos 5
  const latestCheckins = (props.overview?.recent_checkins ?? []).slice(0, 5);

  // 3. Limitar certificados aos últimos 5
  const latestCertificates = props.recentCertificates.slice(0, 5);

  return (
    <div className="overview-grid">
      {/* Coluna 1: Classificação de Ciclistas */}
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Classificação</p>
            <h2>Líderes da Rota</h2>
          </div>
          <span className="muted-badge">
            {props.loadingOverview ? 'Sincronizando...' : `${sortedRiders.length} ativos`}
          </span>
        </div>

        <div className="scrollable-panel-list">
          {sortedRiders.map((user, index) => {
            const rank = index + 1;
            const progressPercent = totalCheckpoints > 0
              ? Math.min(100, Math.round((user.total_checkins / totalCheckpoints) * 100))
              : 0;

            return (
              <article
                key={user.id}
                className="leaderboard-item"
                onClick={() => props.onSelectUser(user)}
              >
                <div className={`rank-badge rank-${rank <= 3 ? rank : 'default'}`}>
                  {rank}
                </div>

                <div className="avatar-badge" style={{ width: '40px', height: '40px', fontSize: '0.9rem', flexShrink: 0 }}>
                  {(user.full_name ?? user.email ?? 'CR').slice(0, 2).toUpperCase()}
                </div>

                <div className="leaderboard-info">
                  <h3>{user.full_name || 'Sem nome cadastrado'}</h3>
                  <p>{user.email ?? user.id}</p>

                  <div className="rider-progress">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="progress-label">
                      {user.total_checkins}/{totalCheckpoints} checkpoints ({progressPercent}%)
                    </span>
                  </div>
                </div>

                <div className="leaderboard-meta" style={{ flexShrink: 0 }}>
                  {user.has_certificate ? (
                    <span className="crown-badge">Elite</span>
                  ) : null}
                </div>
              </article>
            );
          })}

          {sortedRiders.length === 0 ? (
            <EmptyState
              title="Nenhum ciclista ativo"
              message="Aguardando registros de check-ins no aplicativo."
            />
          ) : null}
        </div>
      </section>

      {/* Coluna 2: Check-ins Recentes (Sem linha do tempo, scroll a 3 de 5) */}
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Atividade</p>
            <h2>Check-ins Recentes</h2>
          </div>
          <span className="muted-badge">{props.overview?.recent_checkins.length ?? 0} total</span>
        </div>

        <div className="scrollable-panel-list">
          {latestCheckins.map((checkin) => (
            <article
              className="timeline-card-premium"
              key={checkin.id}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid rgba(23, 53, 44, 0.08)' }}
            >
              <div
                className="certificate-icon-glow"
                style={{
                  background: 'rgba(23, 53, 44, 0.06)',
                  color: 'var(--bg-strong)',
                  boxShadow: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  flexShrink: 0
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--bg-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {checkin.checkpoint_name}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {checkin.full_name || checkin.user_email || checkin.user_id}
                </p>
              </div>
              <div className="timeline-time-badge" style={{ flexShrink: 0 }}>
                {formatDateTime(checkin.scanned_at)}
              </div>
            </article>
          ))}

          {latestCheckins.length === 0 ? (
            <EmptyState
              title="Sem atividade recente"
              message="Os novos check-ins realizados aparecerão aqui em tempo real."
            />
          ) : null}
        </div>
      </section>

      {/* Coluna 3: Mural de Certificados (scroll a 3 de 5) */}
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Hall of Fame</p>
            <h2>Certificados Emitidos</h2>
          </div>
          <span className="muted-badge">{props.recentCertificates.length} total</span>
        </div>

        <div className="scrollable-panel-list">
          {latestCertificates.map((certificate) => (
            <article className="certificate-card-premium" key={`${certificate.user_id}-${certificate.issued_at}`}>
              <div className="certificate-icon-glow" style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M6 12L10 16L18 8" />
                </svg>
              </div>
              <div className="certificate-details" style={{ minWidth: 0 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {certificate.full_name || certificate.email || certificate.user_id}
                </strong>
                <p>{formatDateTime(certificate.issued_at)}</p>
              </div>
              <span className="certificate-stamp" style={{ flexShrink: 0 }}>Válido</span>
            </article>
          ))}

          {latestCertificates.length === 0 ? (
            <EmptyState
              title="Nenhum certificado emitido"
              message="A API emitirá o certificado automaticamente assim que a rota for completada."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
