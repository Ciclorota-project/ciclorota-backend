import { type Request, type Response } from 'express';
import { CertificateService } from '../services/CertificateService.js';
import { CertificatePdfService } from '../services/CertificatePdfService.js';
import { getPublicBaseUrl } from '../config/http.js';
import { getErrorMessage, getErrorStatus, HttpError } from '../utils/httpError.js';
import { applyPaginationHeaders, parsePaginationQuery } from '../utils/pagination.js';
import { isUuid, normalizeOptionalTrimmedString } from '../utils/validation.js';

const VERIFICATION_CODE_REGEX = /^[A-F0-9]{12}$/;

export class CertificateController {
  private readonly certificateService = new CertificateService();
  private readonly pdfService = new CertificatePdfService();

  async store(request: Request, response: Response): Promise<void> {
    await this.issueCertificate(request, response, request.auth?.userId);
  }

  async storeMe(request: Request, response: Response): Promise<void> {
    await this.issueCertificate(request, response, request.auth?.userId);
  }

  async adminIndex(request: Request, response: Response): Promise<void> {
    try {
      const pagination = parsePaginationQuery(request.query.page, request.query.limit);
      const userId = parseOptionalUuidQuery(request.query.userId);
      const payload = await this.certificateService.listCertificates({
        ...pagination,
        ...(userId ? { userId } : {})
      });
      applyPaginationHeaders(response, payload);
      response.json(payload.items);
    } catch (error: any) {
      response.status(getErrorStatus(error, 500)).json({ error: getErrorMessage(error, 'Erro ao listar certificados.') });
    }
  }

  async adminIssue(request: Request, response: Response): Promise<void> {
    const userId = normalizeRouteParam(request.params.userId);
    await this.issueCertificate(request, response, userId);
  }

  async downloadMe(request: Request, response: Response): Promise<void> {
    const userId = request.auth?.userId;

    if (!userId) {
      response.status(401).json({ error: 'Autenticação obrigatória.' });
      return;
    }

    await this.respondWithPdf(request, response, userId);
  }

  async downloadByUser(request: Request, response: Response): Promise<void> {
    const userId = normalizeRouteParam(request.params.userId);

    if (!userId || !isUuid(userId)) {
      response.status(400).json({ error: 'O userId precisa ser um UUID válido.' });
      return;
    }

    await this.respondWithPdf(request, response, userId);
  }

  async verify(request: Request, response: Response): Promise<void> {
    try {
      const code = normalizeRouteParam(request.params.code)?.toUpperCase();

      if (!code || !VERIFICATION_CODE_REGEX.test(code)) {
        response.status(404).json({ valid: false, error: 'Código de verificação inválido.' });
        return;
      }

      const certificate = await this.certificateService.getCertificateDetailsByCode(code);

      response.json({
        valid: true,
        certificate: {
          id: certificate.id,
          verification_code: certificate.verification_code,
          issued_at: certificate.issued_at,
          holder_name: certificate.holder_name,
          total_checkpoints: certificate.total_checkpoints
        }
      });
    } catch (error: any) {
      const status = getErrorStatus(error, 500);

      if (status === 404) {
        response.status(404).json({ valid: false });
        return;
      }

      response.status(status).json({ valid: false, error: getErrorMessage(error, 'Erro ao verificar o certificado.') });
    }
  }

  private async respondWithPdf(request: Request, response: Response, userId: string): Promise<void> {
    try {
      const baseUrl = getPublicBaseUrl(request);
      const { buffer, filename } = await this.pdfService.generateForUser(userId, baseUrl);

      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      response.setHeader('Content-Length', String(buffer.length));
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).end(buffer);
    } catch (error: any) {
      response
        .status(getErrorStatus(error, 500))
        .json({ error: getErrorMessage(error, 'Erro ao gerar o PDF do certificado.') });
    }
  }

  private async issueCertificate(request: Request, response: Response, userId?: string): Promise<void> {
    try {
      if (!userId) {
        response.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      if (!isUuid(userId)) {
        response.status(400).json({ error: 'O ID do usuário precisa ser um UUID válido.' });
        return;
      }

      const certificate = await this.certificateService.issueCertificate(userId);

      response.status(201).json({
        mensagem: 'Certificado da Ciclorota emitido com sucesso.',
        certificado: certificate
      });
    } catch (error: any) {
      response.status(getErrorStatus(error, 400)).json({ error: getErrorMessage(error, 'Erro ao emitir certificado.') });
    }
  }
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseOptionalUuidQuery(value: unknown) {
  const normalized = normalizeOptionalTrimmedString(value);

  if (!normalized) {
    return undefined;
  }

  if (!isUuid(normalized)) {
    throw new HttpError(400, 'O filtro userId precisa ser um UUID válido.');
  }

  return normalized;
}
