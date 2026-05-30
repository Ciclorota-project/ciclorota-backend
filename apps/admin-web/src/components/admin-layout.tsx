import type { AdminOverviewResponse, AuthUser, UserProfile } from '@ciclorota/shared';
import { NavLink } from 'react-router-dom';
import { MetricCard } from './admin-ui';
import type { AdminView } from '../types/admin';
import { ADMIN_ROUTE_BY_VIEW } from '../lib/routes';

export function AdminHeader(props: {
  user: AuthUser;
  profile: UserProfile | null;
  overview: AdminOverviewResponse | null;
  onRefreshOverview: () => void;
  onLogout: () => void;
}) {
  const identity = props.profile?.full_name || props.user.email || props.user.id;

  return (
    <header className="hero-card">
      <div className="hero-copy">
        <p className="eyebrow">Admin autenticado</p>
        <h1>Painel operacional da Ciclorota em modo de comando real.</h1>
        <p className="hero-text">
          O admin web agora esta estruturado para operar usuarios, checkpoints, check-ins e
          certificados com o backend como fonte unica de verdade.
        </p>
        <div className="hero-actions">
          <span className="status-chip">{identity}</span>
          <span className="status-chip subtle-chip">Role: {props.user.role}</span>
          <button className="secondary-button hero-btn-refresh" type="button" onClick={props.onRefreshOverview}>
            Atualizar overview
          </button>
          <button className="secondary-button hero-btn-logout" type="button" onClick={props.onLogout}>
            Sair
          </button>
        </div>
      </div>

      <div className="hero-grid">
        <MetricCard label="Usuarios" value={props.overview?.summary.users ?? 0} />
        <MetricCard label="Check-ins" value={props.overview?.summary.checkins ?? 0} accent />
        <MetricCard label="Certificados" value={props.overview?.summary.certificates ?? 0} />
        <MetricCard label="Checkpoints" value={props.overview?.summary.checkpoints ?? 0} />
      </div>
    </header>
  );
}

const views: Array<{ id: AdminView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Usuarios' },
  { id: 'checkpoints', label: 'Checkpoints' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'certificates', label: 'Certificados' }
];

export function AdminNavigation(props: {
  loadingDirectories: boolean;
  userCount: number;
  checkpointCount: number;
}) {
  return (
    <section className="nav-panel">
      <div className="view-switcher">
        {views.map((view) => (
          <NavLink
            key={view.id}
            to={ADMIN_ROUTE_BY_VIEW[view.id]}
            className={({ isActive }) => `view-tab${isActive ? ' active' : ''}`}
          >
            {view.label}
          </NavLink>
        ))}
      </div>
      <div className="nav-meta">
        <span>{props.loadingDirectories ? 'Sincronizando diretorios...' : `${props.userCount} usuarios no diretorio`}</span>
        <span>{`${props.checkpointCount} checkpoints carregados`}</span>
      </div>
    </section>
  );
}
