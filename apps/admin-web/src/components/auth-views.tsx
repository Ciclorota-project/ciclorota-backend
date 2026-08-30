import type { FormEventHandler, ReactNode } from 'react';
import { Button, Card, Field, Input } from './ui';

function CenteredShell(props: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-md p-8">{props.children}</Card>
    </div>
  );
}

export function RestoringSessionView() {
  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Restaurando</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">Recuperando sua sessão administrativa.</h1>
      <p className="mt-2 text-sm text-zinc-400">Estamos consultando a sessão atual do Supabase antes de abrir o painel.</p>
    </CenteredShell>
  );
}

export function MissingSupabaseConfigView(props: { apiUrl: string }) {
  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-amber-400">Configuração pendente</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">
        Faltam variáveis do Supabase para autenticar o admin web.
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente do `apps/admin-web` para usar o login
        nativo do Supabase e enviar o bearer token para a API.
      </p>

      <div className="mt-4 flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
        <span>VITE_API_URL: {props.apiUrl}</span>
        <span>Auth: Supabase nativo</span>
      </div>
    </CenteredShell>
  );
}

export function LoginView(props: {
  apiUrl: string;
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) {
  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Ciclorota Admin</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">Entre com uma conta válida para acessar a operação web.</h1>
      <p className="mt-2 text-sm text-zinc-400">
        O painel autentica direto no Supabase e usa o access token da sessão para consumir a API administrativa. O
        acesso continua liberado apenas para usuários com `app_metadata.role` igual a `admin` ou `superadmin`.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={props.onSubmit}>
        <Field label="E-mail">
          <Input
            type="email"
            value={props.email}
            onChange={(event) => props.onEmailChange(event.target.value)}
            placeholder="voce@empresa.com"
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            value={props.password}
            onChange={(event) => props.onPasswordChange(event.target.value)}
            placeholder="Sua senha"
          />
        </Field>
        <Button type="submit" disabled={props.busy}>
          {props.busy ? 'Entrando...' : 'Entrar no admin'}
        </Button>
      </form>

      {props.error ? (
        <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {props.error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
        <span>API: {props.apiUrl}</span>
        <span>Fluxo: Supabase Auth + Bearer /admin/*</span>
      </div>
    </CenteredShell>
  );
}

export function AccessDeniedView(props: { userLabel: string; role: string; onLogout: () => void }) {
  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-rose-400">Acesso negado</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">
        Esta conta autenticou, mas ainda não foi marcada como admin.
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Hoje a API segue a role do Supabase. Para liberar esta conta, defina `app_metadata.role` como `admin` ou
        `superadmin`, com fallback aceito em `user_metadata.role`.
      </p>

      <div className="mt-4 flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
        <span>{props.userLabel}</span>
        <span>Role atual: {props.role}</span>
      </div>

      <Button variant="secondary" type="button" onClick={props.onLogout} className="mt-4">
        Sair
      </Button>
    </CenteredShell>
  );
}
