import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { CertificateService } from './CertificateService.js';

export interface CertificatePdfPayload {
  buffer: Buffer;
  filename: string;
  verificationCode: string;
}

const COLOR_DARK = '#17352c';
const COLOR_GOLD = '#d1a742';
const COLOR_CREAM = '#f6f1e3';
const COLOR_MUTED = '#5c665f';

export class CertificatePdfService {
  private readonly certificateService = new CertificateService();

  async generateForUser(userId: string, publicBaseUrl: string): Promise<CertificatePdfPayload> {
    const certificate = await this.certificateService.getCertificateDetailsForPdf(userId);
    return this.buildPdf(certificate, publicBaseUrl);
  }

  private async buildPdf(
    certificate: Awaited<ReturnType<CertificateService['getCertificateDetailsForPdf']>>,
    publicBaseUrl: string
  ): Promise<CertificatePdfPayload> {
    const verifyUrl = `${publicBaseUrl}/certificates/verify/${certificate.verification_code}`;
    const qrPng = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 220,
      color: { dark: COLOR_DARK, light: '#ffffff' }
    });

    const issuedAt = new Date(certificate.issued_at);
    const issuedDateLong = issuedAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const issuedDateShort = issuedAt.toLocaleDateString('pt-BR');

    return new Promise<CertificatePdfPayload>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
        info: {
          Title: `Certificado Ciclorota — ${certificate.holder_name}`,
          Author: 'Ciclorota',
          Subject: 'Certificado de Conclusão da Rota Oficial Ciclorota',
          Keywords: 'ciclorota,certificado,cicloturismo',
          CreationDate: issuedAt
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `certificado-ciclorota-${certificate.verification_code}.pdf`,
          verificationCode: certificate.verification_code
        });
      });
      doc.on('error', reject);

      // Dimensões A4 paisagem: 842 x 595 pt.
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Fundo creme.
      doc.rect(0, 0, pageWidth, pageHeight).fill(COLOR_CREAM);

      // Borda externa (verde) e interna (dourada).
      doc.lineWidth(6).strokeColor(COLOR_DARK).rect(28, 28, pageWidth - 56, pageHeight - 56).stroke();
      doc.lineWidth(1).strokeColor(COLOR_GOLD).rect(40, 40, pageWidth - 80, pageHeight - 80).stroke();

      // Marca dourada no topo.
      doc
        .fillColor(COLOR_GOLD)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('CICLOROTA — PASSAPORTE OFICIAL DA MATA ATLÂNTICA', 0, 70, {
          align: 'center',
          width: pageWidth
        });

      // Título principal.
      doc
        .fillColor(COLOR_DARK)
        .font('Times-Bold')
        .fontSize(40)
        .text('CERTIFICADO DE CONCLUSÃO', 0, 110, {
          align: 'center',
          width: pageWidth,
          characterSpacing: 1.5
        });

      // Régua dourada decorativa.
      const ruleY = 175;
      doc.lineWidth(2).strokeColor(COLOR_GOLD)
        .moveTo(pageWidth / 2 - 80, ruleY)
        .lineTo(pageWidth / 2 + 80, ruleY)
        .stroke();

      // Texto introdutório.
      doc
        .fillColor(COLOR_MUTED)
        .font('Times-Italic')
        .fontSize(14)
        .text('Conferido a', 0, 200, { align: 'center', width: pageWidth });

      // Nome do ciclista.
      doc
        .fillColor(COLOR_DARK)
        .font('Times-Bold')
        .fontSize(36)
        .text(certificate.holder_name, 60, 230, {
          align: 'center',
          width: pageWidth - 120
        });

      // Corpo descritivo.
      const bodyY = 305;
      const body =
        `Por ter concluído integralmente a Rota Oficial Ciclorota — Mata Atlântica, ` +
        `visitando os ${certificate.total_checkpoints} checkpoints oficiais ao longo do trajeto, ` +
        `com check-ins registrados via QR Code no aplicativo Ciclorota.`;

      doc
        .fillColor(COLOR_DARK)
        .font('Times-Roman')
        .fontSize(14)
        .text(body, 120, bodyY, {
          align: 'center',
          width: pageWidth - 240,
          lineGap: 4
        });

      // Data de emissão (canto inferior esquerdo).
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica')
        .fontSize(10)
        .text('EMITIDO EM', 80, pageHeight - 130);
      doc
        .fillColor(COLOR_DARK)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(issuedDateLong, 80, pageHeight - 115);
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica')
        .fontSize(10)
        .text(`(${issuedDateShort})`, 80, pageHeight - 95);

      // QR Code + código (canto inferior direito).
      const qrSize = 110;
      const qrX = pageWidth - qrSize - 80;
      const qrY = pageHeight - qrSize - 130;
      doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica')
        .fontSize(9)
        .text('CÓDIGO DE VERIFICAÇÃO', qrX - 60, qrY + qrSize + 6, {
          width: qrSize + 120,
          align: 'center'
        });
      doc
        .fillColor(COLOR_DARK)
        .font('Courier-Bold')
        .fontSize(13)
        .text(certificate.verification_code, qrX - 60, qrY + qrSize + 20, {
          width: qrSize + 120,
          align: 'center',
          characterSpacing: 1
        });

      // Rodapé.
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Verifique a autenticidade deste certificado em ${verifyUrl}`,
          60,
          pageHeight - 60,
          { align: 'center', width: pageWidth - 120 }
        );

      doc.end();
    });
  }
}
