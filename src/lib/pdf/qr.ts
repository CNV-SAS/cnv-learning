// QR code generation server-side. Genera un data URL PNG embebible
// como Image en react-pdf. La libreria qrcode usa pure JS (sin
// binarios nativos), asi que corre OK en Node y Edge runtime.
//
// errorCorrectionLevel 'M' (15% recovery) balancea fidelidad con
// tamaño compacto del codigo. width 240 da espacio razonable para
// que el QR sea escaneable por celulares promedio sin ocupar
// demasiado en el PDF A4 landscape (842 x 595 pt).
//
// margin 1 (en modulos QR, no en pt) deja borde minimo blanco
// para mejorar el escaneo.
//
// Colores en hex (qrcode acepta hex 6-digit): dark = slate-900,
// light = blanco. Sin transparencia para que el embed en PDF
// quede solido sobre el fondo blanco del page.

import "server-only";
import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}
