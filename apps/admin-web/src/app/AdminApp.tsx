import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type {
  AdminCertificateRecord,
  AdminCertificatesQuery,
  AdminCheckpoint,
  AdminCheckpointPatchInput,
  AdminCheckinsQuery,
  AdminOverviewResponse,
  AdminRecentCheckin,
  AdminUserPatchInput,
  AdminUserRecord,
  AdminUsersQuery
} from '@ciclorota/shared';
import { AdminHeader, AdminNavigation } from '../components/admin-layout';
import { ConfirmDialog } from '../components/admin-ui';
import { AccessDeniedView, LoginView, MissingSupabaseConfigView, RestoringSessionView } from '../components/auth-views';
import { CertificatesSection } from '../features/certificates/CertificatesSection';
import { CheckinsSection } from '../features/checkins/CheckinsSection';
import { CheckpointsSection } from '../features/checkpoints/CheckpointsSection';
import { OverviewSection } from '../features/overview/OverviewSection';
import { UsersSection } from '../features/users/UsersSection';
import {
  createEmptyCheckpointForm,
  createEmptyUserDraft,
  DEFAULT_PAGE_SIZE,
  DIRECTORY_CHECKPOINTS_LIMIT,
  DIRECTORY_USERS_LIMIT,
  OVERVIEW_CERTIFICATES_LIMIT,
  toCheckpointForm,
  toCheckpointPayload
} from '../lib/admin-state';
import { API_URL } from '../lib/env';
import { ApiRequestError, toErrorMessage } from '../lib/errors';
import { createEmptyPagination, createPaginationFromLength } from '../lib/pagination';
import {
  buildAdminUserPath,
  buildLoginPath,
  DEFAULT_ADMIN_ROUTE,
  getAdminUserIdFromPath,
  LOGIN_ROUTE,
  resolveAdminView,
  sanitizeNextPath
} from '../lib/routes';
import { useAdminSession } from '../hooks/useAdminSession';
import {
  createAdminCheckpoint,
  deleteAdminCheckpoint,
  deleteCheckpointImage,
  fetchAdminCertificates,
  fetchAdminCheckins,
  fetchAdminCheckpoints,
  fetchAdminDirectories,
  fetchAdminOverview,
  fetchAdminUser,
  fetchAdminUsers,
  issueAdminCertificate,
  updateAdminCheckpoint,
  updateAdminUser,
  uploadCheckpointImages
} from '../services/admin';
import type {
  CertificatesFilterState,
  CheckinsFilterState,
  CheckpointFormState,
  UserDraftState,
  UsersFilterState
} from '../types/admin';

function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersPagination, setUsersPagination] = useState(createEmptyPagination());
  const [userDirectory, setUserDirectory] = useState<AdminUserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false);
  const [userDraft, setUserDraft] = useState<UserDraftState>(createEmptyUserDraft());
  const [checkpoints, setCheckpoints] = useState<AdminCheckpoint[]>([]);
  const [checkpointsPagination, setCheckpointsPagination] = useState(createEmptyPagination());
  const [checkpointDirectory, setCheckpointDirectory] = useState<AdminCheckpoint[]>([]);
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null);
  const [checkpointForm, setCheckpointForm] = useState<CheckpointFormState>(createEmptyCheckpointForm());
  const [checkins, setCheckins] = useState<AdminRecentCheckin[]>([]);
  const [checkinsPagination, setCheckinsPagination] = useState(createEmptyPagination());
  const [certificates, setCertificates] = useState<AdminCertificateRecord[]>([]);
  const [recentCertificates, setRecentCertificates] = useState<AdminCertificateRecord[]>([]);
  const [certificatesPagination, setCertificatesPagination] = useState(createEmptyPagination());
  const [usersQuery, setUsersQuery] = useState<AdminUsersQuery>({ page: 1, limit: DEFAULT_PAGE_SIZE });
  const [usersFilters, setUsersFilters] = useState<UsersFilterState>({ search: '', role: 'all' });
  const [checkpointsPage, setCheckpointsPage] = useState(1);
  const [checkinsQuery, setCheckinsQuery] = useState<AdminCheckinsQuery>({ page: 1, limit: DEFAULT_PAGE_SIZE });
  const [checkinsFilters, setCheckinsFilters] = useState<CheckinsFilterState>({ userId: '', checkpointId: '' });
  const [certificatesQuery, setCertificatesQuery] = useState<AdminCertificatesQuery>({ page: 1, limit: DEFAULT_PAGE_SIZE });
  const [certificatesFilters, setCertificatesFilters] = useState<CertificatesFilterState>({ userId: '' });
  const [certificateIssueUserId, setCertificateIssueUserId] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingCheckpoint, setDeletingCheckpoint] = useState(false);
  const [deleteCheckpointModalOpen, setDeleteCheckpointModalOpen] = useState(false);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    hasSupabaseConfig,
    session,
    profile,
    restoring,
    busy,
    error: authError,
    clearError: clearAuthError,
    signIn,
    signOut
  } = useAdminSession();

  const currentView = resolveAdminView(location.pathname);
  const selectedUserId = getAdminUserIdFromPath(location.pathname);
  const loginNextPath = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return sanitizeNextPath(searchParams.get('next'));
  }, [location.search]);

  const topUsers = useMemo(() => overview?.users.slice(0, 4) ?? [], [overview]);
  const currentCheckpoint = useMemo(
    () => checkpointDirectory.find((checkpoint) => checkpoint.id === editingCheckpointId) ?? null,
    [checkpointDirectory, editingCheckpointId]
  );
  const canChangeRoles = session?.user.role === 'superadmin';
  const visibleError = authError ?? error;

  useEffect(() => {
    if (session) {
      return;
    }

    resetAdminWorkspace();
  }, [session]);

  useEffect(() => {
    if (!session?.user.is_admin) {
      setOverview(null);
      setRecentCertificates([]);
      setUserDirectory([]);
      setCheckpointDirectory([]);
      setSelectedUser(null);
      return;
    }

    void loadOverview(session.accessToken);
    void loadRecentCertificates(session.accessToken);
    void loadDirectories(session.accessToken);
  }, [session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'users') {
      return;
    }

    void loadUsers(session.accessToken, usersQuery);
  }, [currentView, session?.accessToken, session?.user.is_admin, usersQuery]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'users') {
      return;
    }

    const handler = setTimeout(() => {
      setUsersQuery((current) => {
        const nextSearch = usersFilters.search.trim();
        const nextRole = usersFilters.role !== 'all' ? usersFilters.role : undefined;

        if (current.search === (nextSearch || undefined) && current.role === nextRole) {
          return current;
        }

        const nextQuery: AdminUsersQuery = {
          page: 1,
          limit: current.limit ?? DEFAULT_PAGE_SIZE,
          ...(nextSearch ? { search: nextSearch } : {}),
          ...(nextRole ? { role: nextRole } : {})
        };

        return nextQuery;
      });
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [usersFilters.search, usersFilters.role, currentView, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'users') {
      setSelectedUser(null);
      setUserDraft(createEmptyUserDraft());
      setLoadingSelectedUser(false);
      return;
    }

    if (!selectedUserId) {
      setSelectedUser(null);
      setUserDraft(createEmptyUserDraft());
      setLoadingSelectedUser(false);
      return;
    }

    void loadSelectedUser(session.accessToken, selectedUserId);
  }, [currentView, selectedUserId, session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'checkpoints') {
      return;
    }

    void loadCheckpoints(session.accessToken, checkpointsPage);
  }, [currentView, checkpointsPage, session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'checkins') {
      return;
    }

    void loadCheckins(session.accessToken, checkinsQuery);
  }, [currentView, checkinsQuery, session?.accessToken, session?.user.is_admin]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Informe e-mail e senha para entrar no painel.');
      clearAuthError();
      return;
    }

    resetMessages();

    const signedIn = await signIn(email.trim(), password);

    if (!signedIn) {
      return;
    }

    navigate(loginNextPath ?? DEFAULT_ADMIN_ROUTE, { replace: true });
    setFeedback('Sessao Supabase iniciada com sucesso.');
    setPassword('');
  }

  async function loadOverview(accessToken: string) {
    try {
      setLoadingOverview(true);
      const payload = await fetchAdminOverview(accessToken);
      setOverview(payload.data);
    } catch (caughtError) {
      await handleAppError(caughtError);
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }

  async function loadRecentCertificates(accessToken: string) {
    try {
      const payload = await fetchAdminCertificates(accessToken, {
        page: 1,
        limit: OVERVIEW_CERTIFICATES_LIMIT
      });

      setRecentCertificates(payload.data);
    } catch (caughtError) {
      await handleAppError(caughtError);
      setRecentCertificates([]);
    }
  }

  async function loadDirectories(accessToken: string) {
    try {
      setLoadingDirectories(true);

      const payload = await fetchAdminDirectories(accessToken, {
        usersLimit: DIRECTORY_USERS_LIMIT,
        checkpointsLimit: DIRECTORY_CHECKPOINTS_LIMIT
      });

      setUserDirectory(payload.users);
      setCheckpointDirectory(payload.checkpoints);

      if (!editingCheckpointId && payload.checkpoints[0]) {
        setCheckpointForm(toCheckpointForm(payload.checkpoints[0]));
        setEditingCheckpointId(payload.checkpoints[0].id);
      }

      if (!certificateIssueUserId && payload.users[0]) {
        setCertificateIssueUserId(payload.users[0].id);
      }
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setLoadingDirectories(false);
    }
  }

  async function loadUsers(accessToken: string, query: AdminUsersQuery) {
    try {
      setLoadingUsers(true);
      const payload = await fetchAdminUsers(accessToken, query);
      setUsers(payload.data);
      setUsersPagination(
        payload.pagination ?? createPaginationFromLength(payload.data.length, query.limit ?? DEFAULT_PAGE_SIZE, query.page ?? 1)
      );
    } catch (caughtError) {
      await handleAppError(caughtError);
      setUsers([]);
      setUsersPagination(createEmptyPagination());
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadSelectedUser(accessToken: string, userId: string) {
    try {
      setLoadingSelectedUser(true);
      const payload = await fetchAdminUser(accessToken, userId);

      setSelectedUser(payload.data);
      setUserDraft({
        full_name: payload.data.full_name ?? '',
        avatar_url: payload.data.avatar_url ?? '',
        role: payload.data.role
      });
      setCertificateIssueUserId((currentValue) => currentValue || payload.data.id);
    } catch (caughtError) {
      await handleAppError(caughtError);
      setSelectedUser(null);
    } finally {
      setLoadingSelectedUser(false);
    }
  }

  async function loadCheckpoints(accessToken: string, page: number) {
    try {
      setLoadingCheckpoints(true);
      const payload = await fetchAdminCheckpoints(accessToken, { page, limit: DEFAULT_PAGE_SIZE });
      setCheckpoints(payload.data);
      setCheckpointsPagination(
        payload.pagination ?? createPaginationFromLength(payload.data.length, DEFAULT_PAGE_SIZE, page)
      );
    } catch (caughtError) {
      await handleAppError(caughtError);
      setCheckpoints([]);
      setCheckpointsPagination(createEmptyPagination());
    } finally {
      setLoadingCheckpoints(false);
    }
  }

  async function loadCheckins(accessToken: string, query: AdminCheckinsQuery) {
    try {
      setLoadingCheckins(true);
      const payload = await fetchAdminCheckins(accessToken, query);
      setCheckins(payload.data);
      setCheckinsPagination(
        payload.pagination ?? createPaginationFromLength(payload.data.length, query.limit ?? DEFAULT_PAGE_SIZE, query.page ?? 1)
      );
    } catch (caughtError) {
      await handleAppError(caughtError);
      setCheckins([]);
      setCheckinsPagination(createEmptyPagination());
    } finally {
      setLoadingCheckins(false);
    }
  }

  async function loadCertificates(accessToken: string, query: AdminCertificatesQuery) {
    try {
      setLoadingCertificates(true);
      const payload = await fetchAdminCertificates(accessToken, query);
      setCertificates(payload.data);
      setCertificatesPagination(
        payload.pagination ?? createPaginationFromLength(payload.data.length, query.limit ?? DEFAULT_PAGE_SIZE, query.page ?? 1)
      );
    } catch (caughtError) {
      await handleAppError(caughtError);
      setCertificates([]);
      setCertificatesPagination(createEmptyPagination());
    } finally {
      setLoadingCertificates(false);
    }
  }

  function selectUser(user: AdminUserRecord) {
    navigate(buildAdminUserPath(user.id));
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken || !selectedUserId) {
      return;
    }

    const payload: AdminUserPatchInput = {
      full_name: userDraft.full_name.trim() ? userDraft.full_name.trim() : null,
      avatar_url: userDraft.avatar_url.trim() ? userDraft.avatar_url.trim() : null,
      ...(canChangeRoles ? { role: userDraft.role } : {})
    };

    try {
      setSavingUser(true);
      resetMessages();

      const result = await updateAdminUser(session.accessToken, selectedUserId, payload);

      setFeedback('Usuario atualizado com sucesso.');
      setSelectedUser(result.data);
      setUserDraft({
        full_name: result.data.full_name ?? '',
        avatar_url: result.data.avatar_url ?? '',
        role: result.data.role
      });

      await Promise.all([
        loadOverview(session.accessToken),
        loadUsers(session.accessToken, usersQuery),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleIssueCertificate(targetUserId: string) {
    if (!session?.accessToken || !targetUserId) {
      return;
    }

    try {
      setIssuingCertificate(true);
      resetMessages();

      const payload = await issueAdminCertificate(session.accessToken, targetUserId);

      setFeedback(payload.data.mensagem);
      await Promise.all([
        loadOverview(session.accessToken),
        loadUsers(session.accessToken, usersQuery),
        // recentCertificates ainda alimenta o painel de Overview.
        loadRecentCertificates(session.accessToken),
        loadDirectories(session.accessToken),
        ...(selectedUserId === targetUserId ? [loadSelectedUser(session.accessToken, targetUserId)] : [])
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setIssuingCertificate(false);
    }
  }

  async function handleSubmitCheckpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session?.accessToken) {
      return;
    }

    try {
      setSavingCheckpoint(true);
      resetMessages();

      const payload = toCheckpointPayload(checkpointForm);
      const result = editingCheckpointId
        ? await updateAdminCheckpoint(session.accessToken, editingCheckpointId, payload satisfies AdminCheckpointPatchInput)
        : await createAdminCheckpoint(session.accessToken, payload);

      setFeedback(editingCheckpointId ? 'Checkpoint atualizado com sucesso.' : 'Checkpoint criado com sucesso.');
      setEditingCheckpointId(result.data.id);
      setCheckpointForm(toCheckpointForm(result.data));
      await Promise.all([
        loadOverview(session.accessToken),
        loadCheckpoints(session.accessToken, checkpointsPage),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setSavingCheckpoint(false);
    }
  }

  function handleCheckpointFormChange(field: keyof CheckpointFormState, value: string) {
    setCheckpointForm((currentValue) => ({
      ...currentValue,
      [field]: value
    }));
  }

  function handleStartCheckpointEdit(checkpoint: AdminCheckpoint) {
    setEditingCheckpointId(checkpoint.id);
    setCheckpointForm(toCheckpointForm(checkpoint));
  }

  function handleNewCheckpoint() {
    setEditingCheckpointId(null);
    setCheckpointForm(createEmptyCheckpointForm());
  }

  function requestDeleteCheckpoint() {
    if (!editingCheckpointId) {
      return;
    }
    setDeleteCheckpointModalOpen(true);
  }

  async function confirmDeleteCheckpoint() {
    if (!session?.accessToken || !editingCheckpointId) {
      return;
    }

    try {
      setDeletingCheckpoint(true);
      resetMessages();
      await deleteAdminCheckpoint(session.accessToken, editingCheckpointId);
      setFeedback('Checkpoint excluído com sucesso.');
      setEditingCheckpointId(null);
      setCheckpointForm(createEmptyCheckpointForm());
      setDeleteCheckpointModalOpen(false);
      await Promise.all([
        loadOverview(session.accessToken),
        loadCheckpoints(session.accessToken, checkpointsPage),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setDeletingCheckpoint(false);
    }
  }

  async function handleUploadCheckpointImages(files: File[]) {
    if (!session?.accessToken || !editingCheckpointId || files.length === 0) {
      return;
    }

    try {
      setUploadingImages(true);
      resetMessages();
      await uploadCheckpointImages(session.accessToken, editingCheckpointId, files);
      setFeedback(files.length > 1 ? 'Imagens enviadas com sucesso.' : 'Imagem enviada com sucesso.');
      await Promise.all([
        loadCheckpoints(session.accessToken, checkpointsPage),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleDeleteCheckpointImage(imageId: string) {
    if (!session?.accessToken || !editingCheckpointId) {
      return;
    }

    try {
      setUploadingImages(true);
      resetMessages();
      await deleteCheckpointImage(session.accessToken, editingCheckpointId, imageId);
      setFeedback('Imagem removida com sucesso.');
      await Promise.all([
        loadCheckpoints(session.accessToken, checkpointsPage),
        loadDirectories(session.accessToken)
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setUploadingImages(false);
    }
  }

  function handleUsersFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsersQuery({
      page: 1,
      limit: usersQuery.limit ?? DEFAULT_PAGE_SIZE,
      ...(usersFilters.search.trim() ? { search: usersFilters.search.trim() } : {}),
      ...(usersFilters.role !== 'all' ? { role: usersFilters.role } : {})
    });
  }

  function handleCheckinsFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckinsQuery({
      page: 1,
      limit: checkinsQuery.limit ?? DEFAULT_PAGE_SIZE,
      ...(checkinsFilters.userId ? { userId: checkinsFilters.userId } : {}),
      ...(checkinsFilters.checkpointId ? { checkpointId: checkinsFilters.checkpointId } : {})
    });
  }

  function handleCertificatesFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCertificatesQuery({
      page: 1,
      limit: certificatesQuery.limit ?? DEFAULT_PAGE_SIZE,
      ...(certificatesFilters.userId ? { userId: certificatesFilters.userId } : {})
    });
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
    setPassword('');
    setFeedback(null);
    setError(null);
  }

  function handleRefreshOverview() {
    if (!session?.accessToken) {
      return;
    }

    void loadOverview(session.accessToken);
    void loadRecentCertificates(session.accessToken);
    void loadDirectories(session.accessToken);
  }

  function resetMessages() {
    clearAuthError();
    setError(null);
    setFeedback(null);
  }

  function resetAdminWorkspace() {
    setOverview(null);
    setUsers([]);
    setUsersPagination(createEmptyPagination());
    setUserDirectory([]);
    setSelectedUser(null);
    setUserDraft(createEmptyUserDraft());
    setCheckpoints([]);
    setCheckpointsPagination(createEmptyPagination());
    setCheckpointDirectory([]);
    setEditingCheckpointId(null);
    setCheckpointForm(createEmptyCheckpointForm());
    setCheckins([]);
    setCheckinsPagination(createEmptyPagination());
    setCertificates([]);
    setRecentCertificates([]);
    setCertificatesPagination(createEmptyPagination());
    setCertificateIssueUserId('');
    setLoadingSelectedUser(false);
  }

  async function handleAppError(caughtError: unknown, options?: { logoutOnUnauthorized?: boolean }) {
    if (caughtError instanceof ApiRequestError && caughtError.status === 401 && options?.logoutOnUnauthorized !== false) {
      await signOut();
      navigate(buildLoginPath(`${location.pathname}${location.search}`), { replace: true });
      setError('Sua sessao expirou. Entre novamente para continuar.');
      return;
    }

    if (
      caughtError instanceof ApiRequestError &&
      (caughtError.status === 400 || caughtError.status === 404) &&
      currentView === 'users' &&
      selectedUserId
    ) {
      navigate('/users', { replace: true });
    }

    setError(toErrorMessage(caughtError));
  }

  if (restoring) {
    return <RestoringSessionView />;
  }

  if (!hasSupabaseConfig) {
    return <MissingSupabaseConfigView apiUrl={API_URL} />;
  }

  if (!session) {
    if (location.pathname !== LOGIN_ROUTE) {
      return <Navigate to={buildLoginPath(`${location.pathname}${location.search}`)} replace />;
    }

    return (
      <LoginView
        apiUrl={API_URL}
        email={email}
        password={password}
        busy={busy}
        error={visibleError}
        onSubmit={handleLogin}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
      />
    );
  }

  if (!session.user.is_admin) {
    return (
      <AccessDeniedView
        userLabel={session.user.email ?? session.user.id}
        role={session.user.role}
        onLogout={() => void handleLogout()}
      />
    );
  }

  if (location.pathname === LOGIN_ROUTE) {
    return <Navigate to={loginNextPath ?? DEFAULT_ADMIN_ROUTE} replace />;
  }

  if (location.pathname === '/') {
    return <Navigate to={DEFAULT_ADMIN_ROUTE} replace />;
  }

  if (!currentView) {
    return <Navigate to={DEFAULT_ADMIN_ROUTE} replace />;
  }

  return (
    <div className="admin-shell">
      <div className="admin-noise" />

      <AdminHeader
        user={session.user}
        profile={profile}
        overview={overview}
        onRefreshOverview={handleRefreshOverview}
        onLogout={() => void handleLogout()}
      />

      <AdminNavigation
        loadingDirectories={loadingDirectories}
        userCount={userDirectory.length}
        checkpointCount={checkpointDirectory.length}
      />

      {visibleError ? <div className="warning-box floating-warning">{visibleError}</div> : null}
      {feedback ? <div className="success-box floating-success">{feedback}</div> : null}

      <main className="content-grid">
        {currentView === 'overview' ? (
          <OverviewSection
            overview={overview}
            loadingOverview={loadingOverview}
            topUsers={topUsers}
            recentCertificates={recentCertificates}
            onSelectUser={selectUser}
          />
        ) : null}

        {currentView === 'users' ? (
          <UsersSection
            users={users}
            loadingUsers={loadingUsers}
            loadingSelectedUser={loadingSelectedUser}
            usersPagination={usersPagination}
            usersFilters={usersFilters}
            selectedUserId={selectedUserId}
            selectedUser={selectedUser}
            userDraft={userDraft}
            canChangeRoles={Boolean(canChangeRoles)}
            savingUser={savingUser}
            issuingCertificate={issuingCertificate}
            onSelectUser={selectUser}
            onFiltersChange={setUsersFilters}
            onSubmitFilters={handleUsersFilterSubmit}
            onResetFilters={() => {
              setUsersFilters({ search: '', role: 'all' });
              setUsersQuery({ page: 1, limit: usersQuery.limit ?? DEFAULT_PAGE_SIZE });
              navigate('/users');
            }}
            onUserDraftChange={(field, value) =>
              setUserDraft((currentValue) => ({
                ...currentValue,
                [field]: value
              }))
            }
            onSubmitUser={handleSaveUser}
            onIssueCertificate={(userId) => void handleIssueCertificate(userId)}
            onChangePage={(page) => setUsersQuery((currentValue) => ({ ...currentValue, page }))}
          />
        ) : null}

        {currentView === 'checkpoints' ? (
          <CheckpointsSection
            checkpointDirectory={checkpointDirectory}
            currentCheckpoint={currentCheckpoint}
            checkpointForm={checkpointForm}
            editingCheckpointId={editingCheckpointId}
            loadingDirectory={loadingDirectories}
            savingCheckpoint={savingCheckpoint}
            uploadingImages={uploadingImages}
            deletingCheckpoint={deletingCheckpoint}
            accessToken={session?.accessToken ?? ''}
            onSubmit={handleSubmitCheckpoint}
            onFormChange={handleCheckpointFormChange}
            onStartEdit={handleStartCheckpointEdit}
            onNewCheckpoint={handleNewCheckpoint}
            onUploadImages={(files) => void handleUploadCheckpointImages(files)}
            onDeleteImage={(imageId) => void handleDeleteCheckpointImage(imageId)}
            onDeleteCheckpoint={requestDeleteCheckpoint}
          />
        ) : null}

        {currentView === 'checkins' ? (
          <CheckinsSection
            checkins={checkins}
            checkinsPagination={checkinsPagination}
            checkinsFilters={checkinsFilters}
            userDirectory={userDirectory}
            checkpointDirectory={checkpointDirectory}
            loadingCheckins={loadingCheckins}
            onFiltersChange={setCheckinsFilters}
            onSubmitFilters={handleCheckinsFilterSubmit}
            onResetFilters={() => {
              setCheckinsFilters({ userId: '', checkpointId: '' });
              setCheckinsQuery({ page: 1, limit: checkinsQuery.limit ?? DEFAULT_PAGE_SIZE });
            }}
            onChangePage={(page) => setCheckinsQuery((currentValue) => ({ ...currentValue, page }))}
          />
        ) : null}

        {currentView === 'certificates' ? (
          <CertificatesSection
            certificateIssueUserId={certificateIssueUserId}
            userDirectory={userDirectory}
            issuingCertificate={issuingCertificate}
            onIssueTargetChange={setCertificateIssueUserId}
            onIssueCertificate={(userId) => void handleIssueCertificate(userId)}
          />
        ) : null}
      </main>

      <ConfirmDialog
        open={deleteCheckpointModalOpen}
        variant="danger"
        title="Excluir este checkpoint?"
        highlight={
          checkpointDirectory.find((item) => item.id === editingCheckpointId)?.name ??
          'Checkpoint selecionado'
        }
        message="Esta ação é permanente. Ao confirmar, os seguintes dados serão removidos:"
        bullets={[
          'O ponto da rota e seu QR Code',
          'Todas as fotos do carrossel deste checkpoint',
          'Todos os check-ins de usuários neste ponto (afeta o progresso deles)'
        ]}
        confirmLabel="Sim, excluir"
        cancelLabel="Manter checkpoint"
        busy={deletingCheckpoint}
        onConfirm={() => void confirmDeleteCheckpoint()}
        onCancel={() => setDeleteCheckpointModalOpen(false)}
      />
    </div>
  );
}

export default AdminApp;
