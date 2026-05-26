// CorporateCertificateDocument: template v1 del certificado
// "Profesional Conectado CNV" (Bloque 22.4). Server-rendered, sin
// "use client".
//
// El layout NO se construye con primitives: el fondo es la imagen
// completa del template (design/templates/corporate-certificate-
// template.png) y solo superponemos 4 elementos dinamicos:
//   1. Nombre del profesional centrado, debajo de "otorgado a".
//   2. Fecha de emision centrada, debajo de "Medellin, Colombia".
//   3. QR code esquina inferior derecha sobre area clara.
//   4. Texto verificacion ("VERIFICA ESTE CERTIFICADO" + URL + ID
//      + Hash) al lado izquierdo del QR.
//
// Coordenadas en pt sobre A4 landscape (842 x 595 pt). El PNG de
// fondo tiene 2000x1414 (aspect 1.414, sqrt(2) - misma ratio A4) y
// escala uniforme al page. Calibracion visual:
//   - "otorgado a"          -> ~36% from top => ~214pt
//   - espacio del nombre     -> centro ~ 256pt => top 230 con
//                               fontSize 38 deja baseline ~254pt
//   - linea separadora       -> ~50% from top => ~298pt
//   - "Medellin, Colombia"   -> ~66% from top => ~393pt
//   - espacio de la fecha    -> top 405, baseline ~414pt
//   - footer derecho (QR)    -> bottom=80 para evitar el ornamento
//                               decorativo de esquina (verde/azul);
//                               right=50 mantiene el margen.
//
// IMPORTANTE (Bloque 22.7 fix Bug A del smoke): react-pdf paginaba a
// 2 hojas cuando TODOS los children del Page eran absolute y el
// Image tenia width/height en porcentaje. El fix tiene 3 partes:
//   1. <Page wrap={false}> para impedir overflow auto.
//   2. Image con top/left/right/bottom = 0 (NO width/height %).
//      Los porcentajes en react-pdf se resuelven contra el parent y
//      cuando el parent es flex sin children flow, calcula 0.
//   3. backgroundImage va PRIMERO en el JSX para que quede debajo
//      del resto en el stacking order del PDF.
//
// Si en el render visual de produccion alguna coordenada queda mal
// alineada, ajustar aqui (calibracion exacta requiere ver el PDF
// generado, no esta verificacion estatica).
//
// Si isRevoked=true, overlay diagonal "REVOCADO" en rojo semi-
// transparente, mismo patron que CertificateDocument (B12).
//
// Helvetica-Oblique es built-in en react-pdf (sin font registration
// requerida). Color del nombre: #1a237e (azul institucional).

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const COLORS = {
  text: "#0f172a",
  muted: "#64748b",
  nameBlue: "#1a237e",
  white: "#ffffff",
  revokedRed: "#dc2626",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    color: COLORS.text,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  studentName: {
    position: "absolute",
    top: 230,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 38,
    fontFamily: "Helvetica-Oblique",
    color: COLORS.nameBlue,
  },
  issuedDate: {
    position: "absolute",
    top: 405,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Helvetica-Oblique",
    color: COLORS.text,
  },
  verifyBlock: {
    position: "absolute",
    bottom: 80,
    right: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verifyCopy: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  verifyLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  verifyUrl: {
    fontSize: 8,
    color: COLORS.text,
    marginBottom: 2,
  },
  verifyMono: {
    fontSize: 7,
    fontFamily: "Courier",
    color: COLORS.text,
  },
  qrImage: {
    width: 70,
    height: 70,
  },
  watermark: {
    position: "absolute",
    top: 220,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 130,
    fontFamily: "Helvetica-Bold",
    color: COLORS.revokedRed,
    opacity: 0.18,
    letterSpacing: 14,
    transform: "rotate(-12deg)",
  },
});

interface CorporateCertificateDocumentProps {
  studentName: string;
  issuedAtLabel: string;
  certificateIdShort: string;
  hashShort: string;
  verifyUrl: string;
  qrDataUrl: string;
  backgroundImageSrc: string | Buffer;
  isRevoked: boolean;
}

export function CorporateCertificateDocument(
  props: CorporateCertificateDocumentProps,
) {
  return (
    <Document
      title={`Profesional Conectado CNV ${props.certificateIdShort}`}
      author="Connected Nutrition Ventures SAS"
      subject={`Certificado Profesional Conectado CNV de ${props.studentName}`}
    >
      <Page
        size="A4"
        orientation="landscape"
        wrap={false}
        style={styles.page}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no soporta alt */}
        <Image
          src={props.backgroundImageSrc as unknown as string}
          style={styles.backgroundImage}
        />

        <Text style={styles.studentName}>{props.studentName}</Text>

        <Text style={styles.issuedDate}>{props.issuedAtLabel}</Text>

        <View style={styles.verifyBlock}>
          <View style={styles.verifyCopy}>
            <Text style={styles.verifyLabel}>VERIFICA ESTE CERTIFICADO</Text>
            <Text style={styles.verifyUrl}>{props.verifyUrl}</Text>
            <Text style={styles.verifyMono}>
              ID {props.certificateIdShort} · Hash {props.hashShort}
            </Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no soporta alt */}
          <Image src={props.qrDataUrl} style={styles.qrImage} />
        </View>

        {props.isRevoked && (
          <Text style={styles.watermark}>REVOCADO</Text>
        )}
      </Page>
    </Document>
  );
}
