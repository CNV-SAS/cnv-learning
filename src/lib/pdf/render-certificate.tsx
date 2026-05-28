// renderCertificatePdf: orquesta QR + react-pdf renderToBuffer.
// Server-only (react-pdf usa modulos node-side internamente).
//
// El verifyUrl resuelve desde NEXT_PUBLIC_APP_URL con fallback al
// dominio canonico, idéntico al patron de lib/email/announcement-
// notification.ts.
//
// issuedAtLabel se formatea como "DD/MM/YYYY" en es para el cuerpo
// del PDF; el ISO completo va en metadata + hash (ya computado por
// el service al crear el cert).

import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generateQrDataUrl } from "./qr";
import { CertificateDocument } from "./certificate";

const DEFAULT_APP_URL = "https://lms.cnvsystem.com";

interface RenderCertificateParams {
  certificateId: string;
  studentName: string;
  courseName: string;
  issuedAtIso: string;
  hash: string;
  isRevoked: boolean;
  // Bloque post-23: indica el tipo de constancia para que el PDF
  // renderice el label correcto ("CONSTANCIA DE FINALIZACION" vs
  // "CONSTANCIA DE ACTUALIZACION").
  kind: "completion" | "update";
}

function buildVerifyUrl(certificateId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
  return `${base}/verify/${certificateId}`;
}

export async function renderCertificatePdf(
  params: RenderCertificateParams,
): Promise<Buffer> {
  const verifyUrl = buildVerifyUrl(params.certificateId);
  const qrDataUrl = await generateQrDataUrl(verifyUrl);

  const issuedAtLabel = format(new Date(params.issuedAtIso), "d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  return await renderToBuffer(
    <CertificateDocument
      studentName={params.studentName}
      courseName={params.courseName}
      issuedAtLabel={issuedAtLabel}
      certificateIdShort={params.certificateId.slice(0, 8)}
      hashShort={params.hash.slice(0, 16)}
      verifyUrl={verifyUrl}
      qrDataUrl={qrDataUrl}
      isRevoked={params.isRevoked}
      kind={params.kind}
    />,
  );
}
