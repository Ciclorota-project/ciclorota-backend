import type { AdminUserRecord } from '@ciclorota/shared';

export function CertificatesSection(props: {
  certificateIssueUserId: string;
  userDirectory: AdminUserRecord[];
  issuingCertificate: boolean;
  onIssueTargetChange: (userId: string) => void;
  onIssueCertificate: (userId: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading inline">
        <div>
          <p className="eyebrow">Emissao</p>
          <h2>Emitir certificado para um usuario elegivel</h2>
        </div>
        <span className="muted-badge">Regras validadas no backend</span>
      </div>

      <form
        className="editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onIssueCertificate(props.certificateIssueUserId);
        }}
      >
        <label>
          Usuario alvo
          <select
            value={props.certificateIssueUserId}
            onChange={(event) => props.onIssueTargetChange(event.target.value)}
          >
            <option value="">Selecione</option>
            {props.userDirectory.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email || user.id}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={!props.certificateIssueUserId || props.issuingCertificate}>
          {props.issuingCertificate ? 'Emitindo...' : 'Emitir certificado'}
        </button>

        <p className="helper-copy">
          A API continua validando elegibilidade por quantidade de checkpoints visitados antes de emitir.
        </p>
      </form>
    </section>
  );
}
