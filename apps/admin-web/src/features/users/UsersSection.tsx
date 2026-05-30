import type { AppRole, AdminUserRecord, PaginationMeta } from '@ciclorota/shared';
import { type FormEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, InfoPill, PaginationControls } from '../../components/admin-ui';
import { formatDateTime } from '../../lib/format';
import type { UserDraftState, UsersFilterState } from '../../types/admin';

export function UsersSection(props: {
  users: AdminUserRecord[];
  loadingUsers: boolean;
  loadingSelectedUser: boolean;
  usersPagination: PaginationMeta;
  usersFilters: UsersFilterState;
  selectedUserId: string | null;
  selectedUser: AdminUserRecord | null;
  userDraft: UserDraftState;
  canChangeRoles: boolean;
  savingUser: boolean;
  issuingCertificate: boolean;
  onSelectUser: (user: AdminUserRecord) => void;
  onFiltersChange: (nextValue: UsersFilterState) => void;
  onSubmitFilters: FormEventHandler<HTMLFormElement>;
  onResetFilters: () => void;
  onUserDraftChange: (field: keyof UserDraftState, value: string) => void;
  onSubmitUser: FormEventHandler<HTMLFormElement>;
  onIssueCertificate: (userId: string) => void;
  onChangePage: (page: number) => void;
}) {
  const navigate = useNavigate();

  const handleCloseModal = () => {
    navigate('/users');
  };

  const handleBackdropClick = () => {
    handleCloseModal();
  };

  return (
    <div className="users-section-wrap">
      <section className="panel">
        <div className="panel-heading inline">
          <div>
            <p className="eyebrow">Usuarios</p>
            <h2>Busca, paginacao e edicao operacional</h2>
          </div>
          <span className="muted-badge">
            {props.loadingUsers ? 'Carregando...' : `${props.usersPagination.total_count} resultados`}
          </span>
        </div>

        <form className="toolbar-grid" onSubmit={props.onSubmitFilters}>
          <label>
            Busca
            <input
              type="search"
              value={props.usersFilters.search}
              onChange={(event) =>
                props.onFiltersChange({
                  ...props.usersFilters,
                  search: event.target.value
                })
              }
              placeholder="Nome, e-mail, role ou UUID"
            />
          </label>
          <label>
            Role
            <select
              value={props.usersFilters.role}
              onChange={(event) =>
                props.onFiltersChange({
                  ...props.usersFilters,
                  role: event.target.value as UsersFilterState['role']
                })
              }
            >
              <option value="all">Todas</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </label>
          <div className="toolbar-actions">
            <button type="submit">Aplicar filtros</button>
            <button type="button" className="secondary-button" onClick={props.onResetFilters}>
              Limpar
            </button>
          </div>
        </form>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>E-mail</th>
                <th>Role</th>
                <th>Check-ins</th>
                <th>Certificado</th>
              </tr>
            </thead>
            <tbody>
              {props.users.map((user) => (
                <tr
                  key={user.id}
                  className={props.selectedUserId === user.id ? 'active-row' : ''}
                  onClick={() => props.onSelectUser(user)}
                >
                  <td>
                    <strong>{user.full_name || 'Sem nome'}</strong>
                  </td>
                  <td>{user.email ?? user.id}</td>
                  <td>{user.role}</td>
                  <td>{user.total_checkins}</td>
                  <td>{user.has_certificate ? 'Sim' : 'Nao'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {props.users.length === 0 ? (
          <EmptyState title="Nenhum usuario encontrado" message="Ajuste os filtros para localizar outras contas." />
        ) : null}

        <PaginationControls pagination={props.usersPagination} onChange={props.onChangePage} />
      </section>

      {/* Editor Modal Overlay */}
      {props.selectedUserId ? (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" type="button" onClick={handleCloseModal} aria-label="Fechar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className="panel-heading inline" style={{ marginBottom: '24px', paddingRight: '40px' }}>
              <div>
                <p className="eyebrow">Editor</p>
                <h2>
                  {props.loadingSelectedUser
                    ? 'Carregando usuario selecionado'
                    : props.selectedUser
                      ? 'Editar usuario selecionado'
                      : 'Selecione um usuario'}
                </h2>
              </div>
              {props.selectedUser ? <span className="muted-badge">{props.selectedUser.role}</span> : null}
            </div>

            {props.loadingSelectedUser ? (
              <EmptyState
                title="Buscando detalhes do usuario"
                message="Estamos carregando o registro completo pela rota dedicada do admin."
              />
            ) : props.selectedUser ? (
              <form className="editor-form" onSubmit={props.onSubmitUser}>
                <div className="detail-grid" style={{ marginBottom: '24px' }}>
                  <InfoPill label="UUID" value={props.selectedUser.id} />
                  <InfoPill label="Criado em" value={formatDateTime(props.selectedUser.created_at)} />
                  <InfoPill label="Check-ins" value={String(props.selectedUser.total_checkins)} />
                  <InfoPill label="Certificado" value={props.selectedUser.has_certificate ? 'Emitido' : 'Pendente'} />
                </div>

                <label>
                  Nome completo
                  <input
                    type="text"
                    value={props.userDraft.full_name}
                    onChange={(event) => props.onUserDraftChange('full_name', event.target.value)}
                    placeholder="Nome exibido no app"
                  />
                </label>

                <label style={{ marginTop: '16px' }}>
                  Avatar URL
                  <input
                    type="text"
                    value={props.userDraft.avatar_url}
                    onChange={(event) => props.onUserDraftChange('avatar_url', event.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <label style={{ marginTop: '16px' }}>
                  Role
                  <select
                    value={props.userDraft.role}
                    onChange={(event) => props.onUserDraftChange('role', event.target.value as AppRole)}
                    disabled={!props.canChangeRoles}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                </label>

                <div className="editor-actions" style={{ marginTop: '24px' }}>
                  <button type="submit" disabled={props.savingUser}>
                    {props.savingUser ? 'Salvando...' : 'Salvar usuario'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={props.issuingCertificate || props.selectedUser.has_certificate}
                    onClick={() => props.onIssueCertificate(props.selectedUser!.id)}
                  >
                    {props.issuingCertificate
                      ? 'Emitindo...'
                      : props.selectedUser.has_certificate
                        ? 'Certificado ja emitido'
                        : 'Emitir certificado'}
                  </button>
                </div>

                {!props.canChangeRoles ? (
                  <p className="helper-copy" style={{ marginTop: '16px' }}>
                    Apenas `superadmin` pode alterar roles. Contas `admin` continuam podendo atualizar os
                    dados operacionais do usuario.
                  </p>
                ) : null}
              </form>
            ) : (
              <EmptyState
                title="Nenhum usuario selecionado"
                message="Abra um usuario pela lista para carregar o detalhe completo em `/users/:userId`."
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
