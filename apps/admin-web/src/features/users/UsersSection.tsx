import type { AppRole, AdminUserRecord, PaginationMeta } from '@ciclorota/shared';
import { ChevronDown, ChevronUp, ChevronsUpDown, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState, type FormEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, InfoPill, PaginationControls } from '../../components/admin-ui';
import { Button, Card, CardHeader, Field, Input, Modal, Select, StatusBadge, Table, TableBody, TableHead, Td, Th } from '../../components/ui';
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
  totalCheckpoints: number;
  onSelectUser: (user: AdminUserRecord) => void;
  onFiltersChange: (nextValue: UsersFilterState) => void;
  onSubmitFilters: FormEventHandler<HTMLFormElement>;
  onResetFilters: () => void;
  onUserDraftChange: (field: keyof UserDraftState, value: string) => void;
  onSubmitUser: FormEventHandler<HTMLFormElement>;
  onIssueCertificate: (userId: string) => void;
  onChangePage: (page: number) => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();

  const handleCloseModal = () => {
    navigate('/users');
  };

  type SortKey = 'name' | 'email' | 'role' | 'checkins' | 'certificate';
  type SortDirection = 'asc' | 'desc';

  const DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
    name: 'asc',
    email: 'asc',
    role: 'desc',
    checkins: 'desc',
    certificate: 'desc'
  };

  const ROLE_RANK: Record<AppRole, number> = {
    superadmin: 2,
    admin: 1,
    user: 0
  };

  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'name',
    direction: DEFAULT_DIRECTION.name
  });

  const handleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DEFAULT_DIRECTION[key] }
    );
  };

  const sortedUsers = useMemo(() => {
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    const list = [...props.users];

    const getTextValue = (user: AdminUserRecord, key: 'name' | 'email') => {
      const raw = key === 'name' ? user.full_name : user.email;
      return typeof raw === 'string' ? raw.trim() : '';
    };

    const nullableBias = (a: AdminUserRecord, b: AdminUserRecord, key: 'name' | 'email') => {
      const va = getTextValue(a, key);
      const vb = getTextValue(b, key);
      if (va && vb) return null;
      if (!va && !vb) return 0;
      return va ? -1 : 1;
    };

    const compare = (a: AdminUserRecord, b: AdminUserRecord) => {
      switch (sort.key) {
        case 'name':
          return collator.compare(getTextValue(a, 'name'), getTextValue(b, 'name'));
        case 'email':
          return collator.compare(getTextValue(a, 'email'), getTextValue(b, 'email'));
        case 'role':
          return ROLE_RANK[a.role] - ROLE_RANK[b.role];
        case 'checkins':
          return a.total_checkins - b.total_checkins;
        case 'certificate':
          return Number(a.has_certificate) - Number(b.has_certificate);
        default:
          return 0;
      }
    };

    list.sort((a, b) => {
      if (sort.key === 'name' || sort.key === 'email') {
        const bias = nullableBias(a, b, sort.key);
        if (bias !== null) return bias;
      }

      const result = compare(a, b);
      return sort.direction === 'asc' ? result : -result;
    });

    return list;
  }, [props.users, sort]);

  const sortIndicator = (key: SortKey) => {
    if (sort.key !== key) {
      return <ChevronsUpDown size={13} className="text-zinc-600" />;
    }
    return sort.direction === 'asc' ? <ChevronUp size={13} className="text-emerald-400" /> : <ChevronDown size={13} className="text-emerald-400" />;
  };

  const sortableHeaderProps = (key: SortKey, label: string) => ({
    onClick: () => handleSort(key),
    role: 'button' as const,
    tabIndex: 0,
    'aria-sort': (sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') as
      | 'ascending'
      | 'descending'
      | 'none',
    onKeyDown: (event: React.KeyboardEvent<HTMLTableCellElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSort(key);
      }
    },
    className: 'cursor-pointer select-none',
    children: (
      <span className="flex items-center gap-1">
        {label}
        {sortIndicator(key)}
      </span>
    )
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Usuários</h1>
        <Button variant="secondary" type="button" onClick={props.onRefresh} disabled={props.loadingUsers}>
          <RefreshCw size={16} className={props.loadingUsers ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader
          eyebrow="Usuários"
          title="Busca, paginação e edição operacional"
          meta={props.loadingUsers ? 'Carregando...' : `${props.usersPagination.total_count} resultados`}
        />

        <form className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={props.onSubmitFilters}>
          <Field label="Busca" className="flex-1">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="search"
                className="pl-9"
                value={props.usersFilters.search}
                onChange={(event) =>
                  props.onFiltersChange({
                    ...props.usersFilters,
                    search: event.target.value
                  })
                }
                placeholder="Nome, e-mail, role ou UUID"
              />
            </div>
          </Field>
          <Field label="Status">
            <Select
              value={props.usersFilters.role}
              onChange={(event) =>
                props.onFiltersChange({
                  ...props.usersFilters,
                  role: event.target.value as UsersFilterState['role']
                })
              }
            >
              <option value="all">Todas as roles</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Aplicar filtros</Button>
            <Button type="button" variant="secondary" onClick={props.onResetFilters}>
              Limpar
            </Button>
          </div>
        </form>

        <div className="px-4 pb-4">
          <Table>
            <TableHead>
              <tr>
                <Th {...sortableHeaderProps('name', 'Usuário')} />
                <Th {...sortableHeaderProps('email', 'E-mail')} />
                <Th className="hidden md:table-cell">Data de Cadastro</Th>
                <Th {...sortableHeaderProps('checkins', 'Rotas Concluídas')} />
                <Th {...sortableHeaderProps('certificate', 'Status')} />
                <Th>Ações</Th>
              </tr>
            </TableHead>
            <TableBody>
              {sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`cursor-pointer transition-colors hover:bg-zinc-800/40 ${
                    props.selectedUserId === user.id ? 'bg-emerald-500/5' : ''
                  }`}
                  onClick={() => props.onSelectUser(user)}
                >
                  <Td className="font-medium text-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                        {(user.full_name ?? user.email ?? 'CR').slice(0, 2).toUpperCase()}
                      </span>
                      {user.full_name || 'Sem nome'}
                    </div>
                  </Td>
                  <Td>{user.email ?? user.id}</Td>
                  <Td className="hidden md:table-cell">{formatDateTime(user.created_at)}</Td>
                  <Td>
                    {user.total_checkins}/{props.totalCheckpoints}
                  </Td>
                  <Td>
                    <StatusBadge tone={user.has_certificate ? 'success' : 'warning'}>
                      {user.has_certificate ? 'Certificado' : 'Pendente'}
                    </StatusBadge>
                  </Td>
                  <Td>
                    <Button
                      variant="ghost"
                      type="button"
                      className="px-2 py-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onSelectUser(user);
                      }}
                    >
                      Editar
                    </Button>
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>

          {props.users.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Nenhum usuário encontrado" message="Ajuste os filtros para localizar outras contas." />
            </div>
          ) : null}

          <PaginationControls pagination={props.usersPagination} onChange={props.onChangePage} />
        </div>
      </Card>

      <Modal
        open={Boolean(props.selectedUserId)}
        onClose={handleCloseModal}
        eyebrow="Editor"
        title={
          props.loadingSelectedUser
            ? 'Carregando usuário selecionado'
            : props.selectedUser
              ? 'Editar usuário selecionado'
              : 'Selecione um usuário'
        }
        meta={
          props.selectedUser ? (
            <StatusBadge tone="neutral">{props.selectedUser.role}</StatusBadge>
          ) : undefined
        }
      >
        {props.loadingSelectedUser ? (
          <EmptyState
            title="Buscando detalhes do usuário"
            message="Estamos carregando o registro completo pela rota dedicada do admin."
          />
        ) : props.selectedUser ? (
          <form className="flex flex-col gap-4" onSubmit={props.onSubmitUser}>
            <div className="grid grid-cols-2 gap-3">
              <InfoPill label="UUID" value={props.selectedUser.id} />
              <InfoPill label="Criado em" value={formatDateTime(props.selectedUser.created_at)} />
              <InfoPill label="Check-ins" value={String(props.selectedUser.total_checkins)} />
              <InfoPill label="Certificado" value={props.selectedUser.has_certificate ? 'Emitido' : 'Pendente'} />
            </div>

            <Field label="Nome completo">
              <Input
                type="text"
                value={props.userDraft.full_name}
                onChange={(event) => props.onUserDraftChange('full_name', event.target.value)}
                placeholder="Nome exibido no app"
              />
            </Field>

            <Field label="Avatar URL">
              <Input
                type="text"
                value={props.userDraft.avatar_url}
                onChange={(event) => props.onUserDraftChange('avatar_url', event.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="Role">
              <Select
                value={props.userDraft.role}
                onChange={(event) => props.onUserDraftChange('role', event.target.value as AppRole)}
                disabled={!props.canChangeRoles}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </Select>
            </Field>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={props.savingUser}>
                {props.savingUser ? 'Salvando...' : 'Salvar usuário'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={props.issuingCertificate || props.selectedUser.has_certificate}
                onClick={() => props.onIssueCertificate(props.selectedUser!.id)}
              >
                {props.issuingCertificate
                  ? 'Emitindo...'
                  : props.selectedUser.has_certificate
                    ? 'Certificado já emitido'
                    : 'Emitir certificado'}
              </Button>
            </div>

            {!props.canChangeRoles ? (
              <p className="text-xs text-zinc-500">
                Apenas `superadmin` pode alterar roles. Contas `admin` continuam podendo atualizar os dados
                operacionais do usuário.
              </p>
            ) : null}
          </form>
        ) : (
          <EmptyState
            title="Nenhum usuário selecionado"
            message="Abra um usuário pela lista para carregar o detalhe completo em `/users/:userId`."
          />
        )}
      </Modal>
    </div>
  );
}
