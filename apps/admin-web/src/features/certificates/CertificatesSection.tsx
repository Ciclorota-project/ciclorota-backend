import type { AdminCertificateRecord, PaginationMeta } from '@ciclorota/shared';
import { Award, Clock } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { EmptyState, MetricCard, PaginationControls, UserPicker } from '../../components/admin-ui';
import { Button, Card, CardHeader, Field, Table, TableBody, TableHead, Td, Th } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import type { CertificatesFilterState } from '../../types/admin';

export function CertificatesSection(props: {
  certificateIssueUserId: string;
  issuingCertificate: boolean;
  certificates: AdminCertificateRecord[];
  certificatesPagination: PaginationMeta;
  loadingCertificates: boolean;
  totalIssued: number;
  pendingCount: number;
  certificatesFilters: CertificatesFilterState;
  accessToken: string;
  onIssueTargetChange: (userId: string) => void;
  onIssueCertificate: (userId: string) => void;
  onFiltersChange: (nextValue: CertificatesFilterState) => void;
  onSubmitFilters: FormEventHandler<HTMLFormElement>;
  onResetFilters: () => void;
  onChangePage: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-100">Certificados</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Total Emitidos" value={props.totalIssued} icon={Award} accent />
        <MetricCard label="Pendentes" value={props.pendingCount} icon={Clock} description="Elegíveis sem certificado" />
      </div>

      <Card>
        <CardHeader eyebrow="Emissão" title="Emitir certificado para um usuário elegível" meta="Regras validadas no backend" />

        <form
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            props.onIssueCertificate(props.certificateIssueUserId);
          }}
        >
          <Field label="Usuário alvo" className="flex-1">
            <UserPicker
              accessToken={props.accessToken}
              value={props.certificateIssueUserId}
              placeholder="Selecione um ciclista"
              onChange={props.onIssueTargetChange}
            />
          </Field>

          <Button type="submit" disabled={!props.certificateIssueUserId || props.issuingCertificate}>
            {props.issuingCertificate ? 'Emitindo...' : 'Emitir certificado'}
          </Button>
        </form>

        <p className="px-4 pb-4 text-xs text-zinc-500">
          A API continua validando elegibilidade por quantidade de checkpoints visitados antes de emitir.
        </p>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Registros"
          title="Certificados emitidos"
          meta={props.loadingCertificates ? 'Carregando...' : `${props.certificatesPagination.total_count} certificados`}
        />

        <form className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={props.onSubmitFilters}>
          <Field label="Ciclista" className="flex-1">
            <UserPicker
              accessToken={props.accessToken}
              value={props.certificatesFilters.userId}
              placeholder="Todos os ciclistas"
              onChange={(userId) => props.onFiltersChange({ ...props.certificatesFilters, userId })}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Aplicar filtro</Button>
            <Button type="button" variant="secondary" onClick={props.onResetFilters}>
              Limpar
            </Button>
          </div>
        </form>

        <div className="px-4 pb-4">
          <Table>
            <TableHead>
              <tr>
                <Th>Ciclista</Th>
                <Th>Data de Conclusão</Th>
              </tr>
            </TableHead>
            <TableBody>
              {props.certificates.map((certificate) => (
                <tr key={`${certificate.user_id}-${certificate.issued_at}`}>
                  <Td className="font-medium text-zinc-100">
                    {certificate.full_name || certificate.email || certificate.user_id}
                  </Td>
                  <Td>{formatDateTime(certificate.issued_at)}</Td>
                </tr>
              ))}
            </TableBody>
          </Table>

          {props.certificates.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Nenhum certificado encontrado" message="Ajuste o filtro ou aguarde novas emissões." />
            </div>
          ) : null}

          <PaginationControls pagination={props.certificatesPagination} onChange={props.onChangePage} />
        </div>
      </Card>
    </div>
  );
}
