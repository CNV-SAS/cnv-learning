// renderCorporateCertificatePdf: orquesta lectura del template PNG +
// generacion del QR + react-pdf renderToBuffer.
//
// Server-only (react-pdf usa modulos node-side internamente, y
// fs.readFile no aplica al cliente).
//
// El PNG del template vive en design/templates/corporate-certificate-
// template.png (asset versionado fuera de public/ para que no se sirva
// estatico via Next). Se lee a Buffer con fs/promises en cold start de
// la request; en produccion Vercel mantiene el binario en /var/task/.
//
// Nota Vercel: para que el binario quede en /var/task/ junto a la
// funcion, Next 16 lo incluye automaticamente si el path se referencia
// con process.cwd() + ruta relativa. Si la build no lo incluye,
// agregar pattern a outputFileTracingIncludes en next.config.
//
// verifyUrl: NEXT_PUBLIC_APP_URL + /verify-corporate/[id]. Mismo
// patron que renderCertificatePdf (B12).

import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generateQrDataUrl } from "./qr";
import { CorporateCertificateDocument } from "./corporate-certificate";

const DEFAULT_APP_URL = "https://lms.cnvsystem.com";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "design",
  "templates",
  "corporate-certificate-template.png",
);

interface RenderCorporateCertificateParams {
  certificateId: string;
  studentName: string;
  issuedAtIso: string;
  hash: string;
  isRevoked: boolean;
}

function buildVerifyUrl(certificateId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
  return `${base}/verify-corporate/${certificateId}`;
}

export async function renderCorporateCertificatePdf(
  params: RenderCorporateCertificateParams,
): Promise<Buffer> {
  const verifyUrl = buildVerifyUrl(params.certificateId);
  const [qrDataUrl, templateBuffer] = await Promise.all([
    generateQrDataUrl(verifyUrl),
    readFile(TEMPLATE_PATH),
  ]);

  // Bloque 22.8 fix Issue 2 del smoke: convertir el Buffer a data URL
  // string explicito. La forma documentada de @react-pdf/renderer 4.x
  // para Image src es string (URL/data URL/path) o
  // { data, format }. Pasar Buffer crudo "funcionaba" en dev pero
  // en prod resultaba en PDF en blanco (Image silently fail). El
  // round-trip base64 cuesta ~280KB en memoria por request; aceptable
  // para una operacion on-demand sobre un PNG de 210KB.
  const backgroundImageSrc = `data:image/png;base64,${templateBuffer.toString("base64")}`;

  const issuedAtLabel = format(
    new Date(params.issuedAtIso),
    "d 'de' MMMM 'de' yyyy",
    { locale: es },
  );

  return await renderToBuffer(
    <CorporateCertificateDocument
      studentName={params.studentName}
      issuedAtLabel={issuedAtLabel}
      certificateIdShort={params.certificateId.slice(0, 8)}
      hashShort={params.hash.slice(0, 16)}
      verifyUrl={verifyUrl}
      qrDataUrl={qrDataUrl}
      backgroundImageSrc={backgroundImageSrc}
      isRevoked={params.isRevoked}
    />,
  );
}
