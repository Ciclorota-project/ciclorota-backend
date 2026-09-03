import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEventHandler, type ReactNode } from 'react';
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
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Ciclorota Admin</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">Verificando sua sessão...</h1>
      <p className="mt-2 text-sm text-zinc-400">Só um instante enquanto confirmamos seu acesso.</p>
    </CenteredShell>
  );
}

export function MissingSupabaseConfigView() {
  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-amber-400">Configuração pendente</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">O painel ainda não está configurado.</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Entre em contato com a equipe técnica para concluir a configuração do ambiente antes de acessar o login.
      </p>
    </CenteredShell>
  );
}

export function LoginView(props: {
  email: string;
  password: string;
  busy: boolean;
  error: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Ciclorota Admin</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">Acesse o painel administrativo</h1>
      <p className="mt-2 text-sm text-zinc-400">Entre com seu e-mail e senha de administrador.</p>

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
          <div className="relative">
            <Input
              type={passwordVisible ? 'text' : 'password'}
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              placeholder="Sua senha"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((value) => !value)}
              aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-500 hover:text-zinc-200"
            >
              {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
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
    </CenteredShell>
  );
}

export function AccessDeniedView(props: { userLabel: string; onLogout: () => void }) {
  return (
    <CenteredShell>
      <p className="text-xs font-medium uppercase tracking-wider text-rose-400">Acesso negado</p>
      <h1 className="mt-1 text-lg font-semibold text-zinc-100">Sua conta não tem permissão de administrador.</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Fale com um administrador do sistema para liberar o seu acesso ao painel.
      </p>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-500">
        {props.userLabel}
      </div>

      <Button variant="secondary" type="button" onClick={props.onLogout} className="mt-4">
        Sair
      </Button>
    </CenteredShell>
  );
}
