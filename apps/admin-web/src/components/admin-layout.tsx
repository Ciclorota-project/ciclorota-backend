import type { AuthUser, UserProfile } from '@ciclorota/shared';
import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from './ui';
import type { AdminView } from '../types/admin';
import { ADMIN_ROUTE_BY_VIEW } from '../lib/routes';

const views: Array<{ id: AdminView; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Usuários' },
  { id: 'checkpoints', label: 'Checkpoints' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'certificates', label: 'Certificados' }
];

export function AdminNavbar(props: {
  user: AuthUser;
  profile: UserProfile | null;
  onLogout: () => void;
}) {
  const identity = props.profile?.full_name || props.user.email || props.user.id;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <span className="shrink-0 text-base font-semibold tracking-tight text-zinc-100">
          Ciclorota <span className="text-emerald-400">Admin</span>
        </span>

        <nav className="hidden items-center gap-1 md:flex">
          {views.map((view) => (
            <NavLink
              key={view.id}
              to={ADMIN_ROUTE_BY_VIEW[view.id]}
              className={({ isActive }) =>
                `border-b-2 px-3 py-5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-100'
                }`
              }
            >
              {view.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="truncate text-sm font-medium text-zinc-200">{identity}</p>
            <p className="text-xs capitalize text-zinc-500">{props.user.role}</p>
          </div>
          <Button variant="secondary" type="button" onClick={props.onLogout}>
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-zinc-800 px-4 md:hidden">
        {views.map((view) => (
          <NavLink
            key={view.id}
            to={ADMIN_ROUTE_BY_VIEW[view.id]}
            className={({ isActive }) =>
              `shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100'
              }`
            }
          >
            {view.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
