import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import type { PaginatedResult, PaginationParams } from '../utils/pagination.js';
import { HttpError } from '../utils/httpError.js';
import { ProfileService } from './ProfileService.js';

const VERIFICATION_CODE_BYTES = 6; // 6 bytes -> 12 chars hex maiúsculos.

export function generateVerificationCode() {
  return randomBytes(VERIFICATION_CODE_BYTES).toString('hex').toUpperCase();
}

interface CertificateListQuery extends PaginationParams {
  userId?: string;
}

export class CertificateService {
  private readonly profileService = new ProfileService();

  async issueCertificate(userId: string) {
    const { count: totalCheckpoints, error: errCheckpoints } = await supabaseAdmin
      .from('checkpoints')
      .select('*', { count: 'exact', head: true });

    if (errCheckpoints) {
      throw new Error('Erro ao buscar checkpoints.');
    }

    const { count: userCheckins, error: errCheckins } = await supabaseAdmin
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (errCheckins) {
      throw new Error('Erro ao buscar check-ins do usuário.');
    }

    if (userCheckins === null || totalCheckpoints === null || userCheckins < totalCheckpoints) {
      throw new Error(`Conclusão pendente: Você visitou ${userCheckins} de ${totalCheckpoints} pontos.`);
    }

    // Tenta até 3 vezes para acomodar a (improvável) colisão do verification_code.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const verification_code = generateVerificationCode();

      const { data, error: errCertificate } = await supabaseAdmin
        .from('certificates')
        .insert([{ user_id: userId, verification_code }])
        .select('id, user_id, issued_at, verification_code')
        .single();

      if (!errCertificate) {
        return data;
      }

      if (errCertificate.code === '23505') {
        // Constraint do user_id => usuário já tem certificado.
        if (
          errCertificate.message.includes('certificates_user_unique') ||
          errCertificate.details?.includes('user_id')
        ) {
          throw new HttpError(409, 'Este usuário já possui um certificado emitido!');
        }

        // Caso contrário, colisão do verification_code: tenta de novo.
        continue;
      }

      throw new HttpError(400, errCertificate.message);
    }

    throw new HttpError(500, 'Não foi possível gerar um código de verificação único. Tente novamente.');
  }

  async listCertificates(query: CertificateListQuery): Promise<PaginatedResult<any>> {
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;

    let request = supabaseAdmin
      .from('certificates')
      .select('user_id, issued_at', {
        count: 'exact'
      })
      .order('issued_at', { ascending: false });

    if (query.userId) {
      request = request.eq('user_id', query.userId);
    }

    const { data, error, count } = await request.range(from, to);

    if (error) {
      throw new Error(`Erro ao listar certificados: ${error.message}`);
    }

    const userIds = [...new Set((data ?? []).map((certificate) => certificate.user_id))];
    const [profiles, authUsers] = await Promise.all([
      this.profileService.getProfilesByIds(userIds),
      this.listAuthUsersByIds(userIds)
    ]);

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const authUserMap = new Map(authUsers.map((user) => [user.id, user]));

    const items = (data ?? []).map((certificate) => ({
      user_id: certificate.user_id,
      issued_at: certificate.issued_at,
      email: authUserMap.get(certificate.user_id)?.email ?? null,
      full_name: profileMap.get(certificate.user_id)?.full_name ?? null,
      avatar_url: profileMap.get(certificate.user_id)?.avatar_url ?? null
    }));

    return {
      items,
      page: query.page,
      limit: query.limit,
      total: count ?? 0
    };
  }

  async getCertificateDetailsForPdf(userId: string) {
    return this.getCertificateDetails({ userId });
  }

  async getCertificateDetailsByCode(verificationCode: string) {
    return this.getCertificateDetails({ verificationCode });
  }

  private async getCertificateDetails(args: { userId?: string; verificationCode?: string }) {
    let request = supabaseAdmin
      .from('certificates')
      .select('id, user_id, issued_at, verification_code');

    if (args.userId) {
      request = request.eq('user_id', args.userId);
    } else if (args.verificationCode) {
      request = request.eq('verification_code', args.verificationCode);
    } else {
      throw new HttpError(400, 'Informe userId ou verificationCode para localizar o certificado.');
    }

    const { data: certificate, error } = await request.maybeSingle();

    if (error) {
      throw new HttpError(500, `Erro ao buscar o certificado: ${error.message}`);
    }

    if (!certificate) {
      throw new HttpError(404, 'Certificado não encontrado.');
    }

    const [profile, authUsers, { count: totalCheckpoints }] = await Promise.all([
      this.profileService
        .getProfilesByIds([certificate.user_id])
        .then((profiles) => profiles[0] ?? null),
      this.listAuthUsersByIds([certificate.user_id]),
      supabaseAdmin.from('checkpoints').select('*', { count: 'exact', head: true })
    ]);

    const authUser = authUsers[0] ?? null;
    const holderName = profile?.full_name ?? authUser?.email ?? 'Ciclista Ciclorota';

    return {
      id: certificate.id,
      user_id: certificate.user_id,
      issued_at: certificate.issued_at as string,
      verification_code: certificate.verification_code as string,
      holder_name: holderName as string,
      total_checkpoints: totalCheckpoints ?? 0
    };
  }

  private async listAuthUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin.rpc('admin_users_by_ids', { p_ids: userIds });

    if (error) {
      throw new HttpError(500, `Erro ao listar usuários de autenticação para certificados: ${error.message}`);
    }

    return ((data ?? []) as Array<{ id: string; email: string | null }>).map((user) => ({
      id: user.id,
      email: user.email
    }));
  }
}
