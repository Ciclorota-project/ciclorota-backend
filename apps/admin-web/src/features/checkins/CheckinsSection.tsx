import type { AdminCheckpoint, AdminRecentCheckin, PaginationMeta } from '@ciclorota/shared';
import { RefreshCw } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { EmptyState, PaginationControls, UserPicker } from '../../components/admin-ui';
import { Button, Card, CardHeader, Field, Select, Table, TableBody, TableHead, Td, Th } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import type { CheckinsFilterState } from '../../types/admin';

export function CheckinsSection(props: {
  checkins: AdminRecentCheckin[];
  checkinsPagination: PaginationMeta;
  checkinsFilters: CheckinsFilterState;
  checkpointDirectory: AdminCheckpoint[];
  loadingCheckins: boolean;
  accessToken: string;
  onFiltersChange: (nextValue: CheckinsFilterState) => void;
  onSubmitFilters: FormEventHandler<HTMLFormElement>;
  onResetFilters: () => void;
  onChangePage: (page: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Check-ins</h1>
        <Button variant="secondary" type="button" onClick={props.onRefresh} disabled={props.loadingCheckins}>
          <RefreshCw size={16} className={props.loadingCheckins ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader
          eyebrow="Check-ins"
          title="Auditoria com filtros por usuário e checkpoint"
          meta={props.loadingCheckins ? 'Carregando...' : `${props.checkinsPagination.total_count} eventos`}
        />

        <form className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end" onSubmit={props.onSubmitFilters}>
          <Field label="Ciclista" className="flex-1">
            <UserPicker
              accessToken={props.accessToken}
              value={props.checkinsFilters.userId}
              placeholder="Todos os ciclistas"
              onChange={(userId) =>
                props.onFiltersChange({
                  ...props.checkinsFilters,
                  userId
                })
              }
            />
          </Field>

          <Field label="Checkpoint" className="flex-1">
            <Select
              value={props.checkinsFilters.checkpointId}
              onChange={(event) =>
                props.onFiltersChange({
                  ...props.checkinsFilters,
                  checkpointId: event.target.value
                })
              }
            >
              <option value="">Todos</option>
              {props.checkpointDirectory.map((checkpoint) => (
                <option key={checkpoint.id} value={checkpoint.id}>
                  {checkpoint.name}
                </option>
              ))}
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
                <Th>Data/Hora</Th>
                <Th>Ciclista</Th>
                <Th>Checkpoint</Th>
              </tr>
            </TableHead>
            <TableBody>
              {props.checkins.map((checkin) => (
                <tr key={checkin.id}>
                  <Td className="whitespace-nowrap text-zinc-400">{formatDateTime(checkin.scanned_at)}</Td>
                  <Td className="font-medium text-zinc-100">{checkin.full_name || checkin.user_email || checkin.user_id}</Td>
                  <Td>
                    <span className="block text-zinc-100">{checkin.checkpoint_name}</span>
                    {checkin.checkpoint_description ? (
                      <span className="block text-xs text-zinc-500">{checkin.checkpoint_description}</span>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>

          {props.checkins.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nenhum check-in encontrado"
                message="Os filtros atuais não retornaram eventos. Tente liberar os critérios para ver mais itens."
              />
            </div>
          ) : null}

          <PaginationControls pagination={props.checkinsPagination} onChange={props.onChangePage} />
        </div>
      </Card>
    </div>
  );
}
