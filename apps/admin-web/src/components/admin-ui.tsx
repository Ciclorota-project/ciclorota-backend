import type { AdminUserRecord, PaginationMeta } from '@ciclorota/shared';

const getMetricIcon = (label: string) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('usuario') || lowerLabel.includes('usuário')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="metric-icon">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (lowerLabel.includes('check-in')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="metric-icon">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (lowerLabel.includes('certificado')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="metric-icon">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M6 12L10 16L18 8" />
      </svg>
    );
  }
  if (lowerLabel.includes('checkpoint')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="metric-icon">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  return null;
};

const getMetricTrend = (label: string) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes('usuario') || lowerLabel.includes('usuário')) {
    return (
      <span className="metric-trend up">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        +12% este mês
      </span>
    );
  }
  if (lowerLabel.includes('check-in')) {
    return <span className="metric-trend up">Atividade ativa</span>;
  }
  if (lowerLabel.includes('certificado')) {
    return <span className="metric-trend info">Emissão automática</span>;
  }
  if (lowerLabel.includes('checkpoint')) {
    return <span className="metric-trend info">Rotas catalogadas</span>;
  }
  return null;
};

export function MetricCard(props: { label: string; value: number; accent?: boolean }) {
  return (
    <article className={`metric-card${props.accent ? ' accent' : ''}`}>
      <div className="metric-card-top">
        <span className="metric-label">{props.label}</span>
        {getMetricIcon(props.label)}
      </div>
      <div>
        <strong>{props.value}</strong>
        {getMetricTrend(props.label)}
      </div>
    </article>
  );
}

export function UserCard(props: { user: AdminUserRecord; onSelect: (user: AdminUserRecord) => void }) {
  const { user, onSelect } = props;

  return (
    <article className="user-card clickable-card" onClick={() => onSelect(user)}>
      <div className="user-card-top">
        <div className="avatar-badge">
          {(user.full_name ?? user.email ?? 'CR').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3>{user.full_name || 'Sem nome cadastrado'}</h3>
          <p>{user.email ?? user.id}</p>
        </div>
      </div>
      <dl className="user-card-meta">
        <div>
          <dt>Check-ins</dt>
          <dd>{user.total_checkins}</dd>
        </div>
        <div>
          <dt>Certificado</dt>
          <dd>{user.has_certificate ? 'Sim' : 'Não'}</dd>
        </div>
        <div>
          <dt>Papel</dt>
          <dd style={{ textTransform: 'capitalize' }}>{user.role}</dd>
        </div>
      </dl>
    </article>
  );
}

export function PaginationControls(props: { pagination: PaginationMeta; onChange: (page: number) => void }) {
  const { pagination, onChange } = props;

  if (pagination.total_pages <= 1) {
    return null;
  }

  return (
    <div className="pagination-bar">
      <button type="button" className="secondary-button" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>
        Anterior
      </button>
      <span className="pagination-copy">
        Pagina {pagination.page} de {pagination.total_pages}
      </span>
      <button
        type="button"
        className="secondary-button"
        disabled={pagination.page >= pagination.total_pages}
        onClick={() => onChange(pagination.page + 1)}
      >
        Proxima
      </button>
    </div>
  );
}

export function InfoPill(props: { label: string; value: string }) {
  return (
    <article className="info-pill">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

export function EmptyState(props: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.message}</p>
    </div>
  );
}
