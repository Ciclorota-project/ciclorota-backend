import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type {
  AdminCertificateRecord,
  AdminCertificatesQuery,
  AdminCheckpoint,
  AdminCheckpointPatchInput,
  AdminCheckinsQuery,
  AdminOverviewResponse,
  AdminRecentCheckin,
  AdminSettings,
  AdminUserPatchInput,
  AdminUserRecord,
  AdminUsersQuery
} from '@ciclorota/shared';
import { AdminNavbar } from '../components/admin-layout';
import { ConfirmDialog } from '../components/admin-ui';
import { AccessDeniedView, LoginView, MissingSupabaseConfigView, RestoringSessionView } from '../components/auth-views';
import { ToastStack, type ToastItem } from '../components/toast';
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
  OVERVIEW_CERTIFICATES_LIMIT,
  toCheckpointForm,
  toCheckpointPayload
} from '../lib/admin-state';
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
  fetchAdminOverview,
  fetchAdminSettings,
  fetchAdminUser,
  fetchAdminUsers,
  issueAdminCertificate,
  updateAdminCheckpoint,
  updateAdminSettings,
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

// Evita refazer a requisição de uma aba sempre que o usuário volta pra ela:
// cada aba com dados paginados/filtrados só recarrega quando a query mudou
// (filtro, página etc.) ou ainda não foi carregada nesta sessão. Trocar de
// aba e voltar reaproveita o que já está em memória; o botão "Atualizar" de
// cada aba força uma nova busca quando necessário.
function useLoadOnceGuard<Query>() {
  const loadedRef = useRef(false);
  const lastQueryRef = useRef<Query | undefined>(undefined);

  function shouldSkip(query: Query): boolean {
    const isSameQuery = loadedRef.current && JSON.stringify(lastQueryRef.current) === JSON.stringify(query);

    if (isSameQuery) {
      return true;
    }

    loadedRef.current = true;
    lastQueryRef.current = query;
    return false;
  }

  return { shouldSkip };
}

function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();

  const usersLoadGuard = useLoadOnceGuard<AdminUsersQuery>();
  const checkinsLoadGuard = useLoadOnceGuard<AdminCheckinsQuery>();
  const certificatesLoadGuard = useLoadOnceGuard<AdminCertificatesQuery>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersPagination, setUsersPagination] = useState(createEmptyPagination());
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [loadingSelectedUser, setLoadingSelectedUser] = useState(false);
  const [userDraft, setUserDraft] = useState<UserDraftState>(createEmptyUserDraft());
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
  const [checkinsQuery, setCheckinsQuery] = useState<AdminCheckinsQuery>({ page: 1, limit: DEFAULT_PAGE_SIZE });
  const [checkinsFilters, setCheckinsFilters] = useState<CheckinsFilterState>({ userId: '', checkpointId: '' });
  const [certificatesQuery, setCertificatesQuery] = useState<AdminCertificatesQuery>({ page: 1, limit: DEFAULT_PAGE_SIZE });
  const [certificatesFilters, setCertificatesFilters] = useState<CertificatesFilterState>({ userId: '' });
  const [certificateIssueUserId, setCertificateIssueUserId] = useState('');
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [savingGeofenceSetting, setSavingGeofenceSetting] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [loadingDirectories, setLoadingDirectories] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingCheckpoint, setDeletingCheckpoint] = useState(false);
  const [deleteCheckpointModalOpen, setDeleteCheckpointModalOpen] = useState(false);
  const [geofenceConfirmOpen, setGeofenceConfirmOpen] = useState(false);
  const [issuingCertificate, setIssuingCertificate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
      setCheckpointDirectory([]);
      setSelectedUser(null);
      setSettings(null);
      return;
    }

    void loadOverview(session.accessToken);
    void loadRecentCertificates(session.accessToken);
    void loadCheckpointDirectory(session.accessToken);
    void loadSettings(session.accessToken);
  }, [session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'users') {
      return;
    }

    if (usersLoadGuard.shouldSkip(usersQuery)) {
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
    if (!session?.user.is_admin || currentView !== 'checkins') {
      return;
    }

    if (checkinsLoadGuard.shouldSkip(checkinsQuery)) {
      return;
    }

    void loadCheckins(session.accessToken, checkinsQuery);
  }, [currentView, checkinsQuery, session?.accessToken, session?.user.is_admin]);

  useEffect(() => {
    if (!session?.user.is_admin || currentView !== 'certificates') {
      return;
    }

    if (certificatesLoadGuard.shouldSkip(certificatesQuery)) {
      return;
    }

    void loadCertificates(session.accessToken, certificatesQuery);
  }, [currentView, certificatesQuery, session?.accessToken, session?.user.is_admin]);

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
    pushToast('success', 'Login realizado com sucesso.');
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

  async function loadCheckpointDirectory(accessToken: string) {
    try {
      setLoadingDirectories(true);

      const payload = await fetchAdminCheckpoints(accessToken, { page: 1, limit: DIRECTORY_CHECKPOINTS_LIMIT });

      setCheckpointDirectory(payload.data);

      if (!editingCheckpointId && payload.data[0]) {
        setCheckpointForm(toCheckpointForm(payload.data[0]));
        setEditingCheckpointId(payload.data[0].id);
      }
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setLoadingDirectories(false);
    }
  }

  async function loadSettings(accessToken: string) {
    try {
      const payload = await fetchAdminSettings(accessToken);
      setSettings(payload.data);
    } catch (caughtError) {
      await handleAppError(caughtError);
    }
  }

  function requestToggleGeofence(disabled: boolean) {
    // Ligar de volta é seguro e aplica na hora; desligar remove uma proteção
    // contra check-ins fraudulentos em toda a rota, então pede confirmação.
    if (disabled) {
      setGeofenceConfirmOpen(true);
      return;
    }

    void applyGeofenceToggle(false);
  }

  async function confirmDisableGeofence() {
    await applyGeofenceToggle(true);
    setGeofenceConfirmOpen(false);
  }

  async function applyGeofenceToggle(disabled: boolean) {
    if (!session?.accessToken) {
      return;
    }

    const previousSettings = settings;
    setSettings((currentValue) => ({ ...(currentValue ?? { geofence_disabled: false }), geofence_disabled: disabled }));

    try {
      setSavingGeofenceSetting(true);
      resetMessages();
      const payload = await updateAdminSettings(session.accessToken, { geofence_disabled: disabled });
      setSettings(payload.data);
      pushToast(
        'success',
        payload.data.geofence_disabled
          ? 'Geofence desligado para toda a rota.'
          : 'Geofence ligado novamente para toda a rota.'
      );
    } catch (caughtError) {
      setSettings(previousSettings);
      await handleAppError(caughtError);
    } finally {
      setSavingGeofenceSetting(false);
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

      pushToast('success', 'Usuario atualizado com sucesso.');
      setSelectedUser(result.data);
      setUserDraft({
        full_name: result.data.full_name ?? '',
        avatar_url: result.data.avatar_url ?? '',
        role: result.data.role
      });

      await Promise.all([
        loadOverview(session.accessToken),
        loadUsers(session.accessToken, usersQuery),
        loadCheckpointDirectory(session.accessToken)
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

      pushToast('success', payload.data.mensagem);
      await Promise.all([
        loadOverview(session.accessToken),
        loadUsers(session.accessToken, usersQuery),
        // recentCertificates ainda alimenta o painel de Overview.
        loadRecentCertificates(session.accessToken),
        loadCheckpointDirectory(session.accessToken),
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

      pushToast('success', editingCheckpointId ? 'Checkpoint atualizado com sucesso.' : 'Checkpoint criado com sucesso.');
      setEditingCheckpointId(result.data.id);
      setCheckpointForm(toCheckpointForm(result.data));
      await Promise.all([
        loadOverview(session.accessToken),
        loadCheckpointDirectory(session.accessToken)
      ]);
    } catch (caughtError) {
      await handleAppError(caughtError);
    } finally {
      setSavingCheckpoint(false);
    }
  }

  function handleCheckpointFormChange(field: keyof CheckpointFormState, value: string | boolean) {
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
      pushToast('success', 'Checkpoint excluído com sucesso.');
      setEditingCheckpointId(null);
      setCheckpointForm(createEmptyCheckpointForm());
      setDeleteCheckpointModalOpen(false);
      await Promise.all([
        loadOverview(session.accessToken),
        loadCheckpointDirectory(session.accessToken)
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
      pushToast('success', files.length > 1 ? 'Imagens enviadas com sucesso.' : 'Imagem enviada com sucesso.');
      await Promise.all([
        loadCheckpointDirectory(session.accessToken)
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
      pushToast('success', 'Imagem removida com sucesso.');
      await Promise.all([
        loadCheckpointDirectory(session.accessToken)
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
    setError(null);
  }

  function handleRefreshOverview() {
    if (!session?.accessToken) {
      return;
    }

    void loadOverview(session.accessToken);
    void loadRecentCertificates(session.accessToken);
    void loadCheckpointDirectory(session.accessToken);
  }

  function handleRefreshUsers() {
    if (!session?.accessToken) {
      return;
    }

    void loadUsers(session.accessToken, usersQuery);
  }

  function handleRefreshCheckpoints() {
    if (!session?.accessToken) {
      return;
    }

    void loadCheckpointDirectory(session.accessToken);
  }

  function handleRefreshCheckins() {
    if (!session?.accessToken) {
      return;
    }

    void loadCheckins(session.accessToken, checkinsQuery);
  }

  function handleRefreshCertificates() {
    if (!session?.accessToken) {
      return;
    }

    void loadCertificates(session.accessToken, certificatesQuery);
  }

  function resetMessages() {
    clearAuthError();
    setError(null);
  }

  function pushToast(type: ToastItem['type'], message: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((current) => [...current, { id, type, message }]);
  }

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  function resetAdminWorkspace() {
    setOverview(null);
    setUsers([]);
    setUsersPagination(createEmptyPagination());
    setSelectedUser(null);
    setUserDraft(createEmptyUserDraft());
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
    setSettings(null);
  }

  async function handleAppError(caughtError: unknown, options?: { logoutOnUnauthorized?: boolean }) {
    if (caughtError instanceof ApiRequestError && caughtError.status === 401 && options?.logoutOnUnauthorized !== false) {
      await signOut();
      navigate(buildLoginPath(`${location.pathname}${location.search}`), { replace: true });
      pushToast('error', 'Sua sessao expirou. Entre novamente para continuar.');
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

    pushToast('error', toErrorMessage(caughtError));
  }

  if (restoring) {
    return <RestoringSessionView />;
  }

  if (!hasSupabaseConfig) {
    return <MissingSupabaseConfigView />;
  }

  if (!session) {
    if (location.pathname !== LOGIN_ROUTE) {
      return <Navigate to={buildLoginPath(`${location.pathname}${location.search}`)} replace />;
    }

    return (
      <LoginView
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

  const totalCheckpoints = overview?.summary.checkpoints ?? checkpointDirectory.length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <AdminNavbar user={session.user} profile={profile} onLogout={() => void handleLogout()} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-28 sm:px-6 md:pt-24 lg:px-8">
        {currentView === 'overview' ? (
          <OverviewSection
            overview={overview}
            loadingOverview={loadingOverview}
            topUsers={topUsers}
            recentCertificates={recentCertificates}
            onSelectUser={selectUser}
            onRefreshOverview={handleRefreshOverview}
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
            totalCheckpoints={totalCheckpoints}
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
            onRefresh={handleRefreshUsers}
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
            geofenceDisabled={settings?.geofence_disabled ?? false}
            savingGeofenceSetting={savingGeofenceSetting}
            isSuperAdmin={Boolean(canChangeRoles)}
            onSubmit={handleSubmitCheckpoint}
            onFormChange={handleCheckpointFormChange}
            onStartEdit={handleStartCheckpointEdit}
            onNewCheckpoint={handleNewCheckpoint}
            onUploadImages={(files) => void handleUploadCheckpointImages(files)}
            onDeleteImage={(imageId) => void handleDeleteCheckpointImage(imageId)}
            onDeleteCheckpoint={requestDeleteCheckpoint}
            onToggleGeofence={requestToggleGeofence}
            onRefresh={handleRefreshCheckpoints}
          />
        ) : null}

        {currentView === 'checkins' ? (
          <CheckinsSection
            checkins={checkins}
            checkinsPagination={checkinsPagination}
            checkinsFilters={checkinsFilters}
            checkpointDirectory={checkpointDirectory}
            loadingCheckins={loadingCheckins}
            accessToken={session?.accessToken ?? ''}
            onFiltersChange={setCheckinsFilters}
            onSubmitFilters={handleCheckinsFilterSubmit}
            onResetFilters={() => {
              setCheckinsFilters({ userId: '', checkpointId: '' });
              setCheckinsQuery({ page: 1, limit: checkinsQuery.limit ?? DEFAULT_PAGE_SIZE });
            }}
            onChangePage={(page) => setCheckinsQuery((currentValue) => ({ ...currentValue, page }))}
            onRefresh={handleRefreshCheckins}
          />
        ) : null}

        {currentView === 'certificates' ? (
          <CertificatesSection
            certificateIssueUserId={certificateIssueUserId}
            issuingCertificate={issuingCertificate}
            certificates={certificates}
            certificatesPagination={certificatesPagination}
            loadingCertificates={loadingCertificates}
            totalIssued={overview?.summary.certificates ?? 0}
            pendingCount={(overview?.users ?? []).filter(
              (user) => user.total_checkins >= totalCheckpoints && totalCheckpoints > 0 && !user.has_certificate
            ).length}
            certificatesFilters={certificatesFilters}
            accessToken={session?.accessToken ?? ''}
            onIssueTargetChange={setCertificateIssueUserId}
            onIssueCertificate={(userId) => void handleIssueCertificate(userId)}
            onFiltersChange={setCertificatesFilters}
            onSubmitFilters={handleCertificatesFilterSubmit}
            onResetFilters={() => {
              setCertificatesFilters({ userId: '' });
              setCertificatesQuery({ page: 1, limit: certificatesQuery.limit ?? DEFAULT_PAGE_SIZE });
            }}
            onChangePage={(page) => setCertificatesQuery((currentValue) => ({ ...currentValue, page }))}
            onRefresh={handleRefreshCertificates}
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

      <ConfirmDialog
        open={geofenceConfirmOpen}
        variant="danger"
        title="Desligar a validação de geofence?"
        message="Com o geofence desligado, check-ins passam a ser aceitos em qualquer distância dos checkpoints, em toda a rota — isso remove a proteção contra check-ins fraudulentos até você ligar novamente."
        confirmLabel="Sim, desligar"
        cancelLabel="Manter ligado"
        busy={savingGeofenceSetting}
        onConfirm={() => void confirmDisableGeofence()}
        onCancel={() => setGeofenceConfirmOpen(false)}
      />
    </div>
  );
}

export default AdminApp;
