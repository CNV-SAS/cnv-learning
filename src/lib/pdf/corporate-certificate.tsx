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
// escala uniforme al page. Calibracion final 22.13:
//   - "otorgado a" (en template)    -> ~36% from top
//   - espacio del nombre             -> top 270
//   - linea separadora (template)    -> ~50% from top
//   - texto reconocimiento (templ.) -> termina ~top 380
//   - "Medellin, Colombia" (dyn.)    -> top 390 (linea 1, 22.13)
//   - fecha de emision (dyn.)        -> top 408 (linea 2, baja de
//                                       425 a 408 para acercarla
//                                       a la ciudad, 22.13)
//   - footer derecho (QR + verify)   -> bottom=15, right=20.
// Pre-22.13 el "Medellin, Colombia" venia hardcoded en el PNG;
// Santiago lo removio del template y ahora se renderiza dinamicamente
// como primera linea del bloque "lugar y fecha" en Montserrat italic
// #102545.
// El verifyBlock usa flexDirection:row + alignItems:center con la
// verifyCopy primero (alignItems:flex-end) y el QR al final, por lo
// que el texto queda automaticamente A LA IZQUIERDA del QR.
//
// IMPORTANTE (Bloque 22.7 fix Bug A "PDF en 2 hojas" + 22.9 fix
// "PDF en blanco"): el patron correcto para PDF con background
// image + overlays absolute requiere 2 cosas:
//   1. Image con top/left/right/bottom = 0 (NO width/height %). Los
//      porcentajes en react-pdf se resuelven contra el parent y
//      cuando el parent es flex sin children flow, calcula 0.
//   2. backgroundImage va PRIMERO en el JSX para que quede debajo
//      del resto en el stacking order del PDF.
//
// NO usar <Page wrap={false}>: aunque parece prevenir paginacion,
// desactiva la fase fetchAssets del runtime (@react-pdf/layout
// fetchImage corre solo en el paginate pass). Resultado: el <Image>
// queda sin resolverse y el PDF sale en blanco. El 22.7 puso
// wrap=false por error; con los demas cambios del 22.7 (absolute
// corners en lugar de width/height %), el PDF queda en 1 hoja sin
// necesidad de wrap=false.
//
// Si en el render visual de produccion alguna coordenada queda mal
// alineada, ajustar aqui (calibracion exacta requiere ver el PDF
// generado, no esta verificacion estatica).
//
// Si isRevoked=true, overlay diagonal "REVOCADO" en rojo semi-
// transparente, mismo patron que CertificateDocument (B12).
//
// Fonts:
//   - Nombre del profesional: Helvetica-Oblique (built-in en react-
//     pdf, sin registration). Color #1a237e (azul institucional).
//   - Fecha de emision: Montserrat Italic (Bloque 22.11, font custom
//     registrada via Font.register desde design/fonts/). Color
//     #102545 (azul institucional oscuro). El archivo .ttf vive en
//     design/fonts/Montserrat-Italic.ttf y se incluye en el bundle
//     prod via outputFileTracingIncludes (next.config.ts).

import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// Font.register debe correr en module-load (NO dentro del componente),
// porque el render llama fetchAssets que busca la font registrada.
// El path absoluto via process.cwd() requiere que el .ttf este en el
// bundle prod (ver next.config.ts outputFileTracingIncludes).
Font.register({
  family: "Montserrat",
  fonts: [
    {
      src: path.join(
        process.cwd(),
        "design",
        "fonts",
        "Montserrat-Italic.ttf",
      ),
      fontStyle: "italic",
      fontWeight: 400,
    },
  ],
});

const COLORS = {
  text: "#0f172a",
  muted: "#64748b",
  nameBlue: "#1a237e",
  dateBlue: "#102545",
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
    top: 270,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 38,
    fontFamily: "Helvetica-Oblique",
    // 22.15: color negro puro (era #1a237e); letterSpacing 1
    // equivalente al spacing 20 de Canva (~1.013 px en navegador).
    color: "#000000",
    letterSpacing: 1,
  },
  // Bloque 22.13: "Medellin, Colombia" se removio del PNG template;
  // ahora se renderiza dinamicamente en 2 lineas centradas debajo
  // del texto descriptivo "En reconocimiento a su formacion..." que
  // termina ~top 380.
  issuedCity: {
    position: "absolute",
    top: 390,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Montserrat",
    fontStyle: "italic",
    color: COLORS.dateBlue,
  },
  issuedDate: {
    position: "absolute",
    top: 408,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Montserrat",
    fontStyle: "italic",
    color: COLORS.dateBlue,
  },
  verifyBlock: {
    position: "absolute",
    // 22.15: bottom=10, right=8. El bloque cae lo mas cerca posible
    // de la esquina inferior derecha sin pisar el borde. Iteraciones
    // anteriores (15/20, 18/18) dejaban margen excesivo respecto al
    // template visual.
    bottom: 10,
    right: 8,
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
  // 22.9: vuelve a Buffer crudo. react-pdf 4.x procesa Buffer via
  // resolveBufferImage detectando formato por magic bytes; no
  // requiere wrapper { data, format } ni base64 round-trip.
  backgroundImageSrc: Buffer;
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
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no soporta alt */}
        <Image
          src={props.backgroundImageSrc as unknown as string}
          style={styles.backgroundImage}
        />

        <Text style={styles.studentName}>{props.studentName}</Text>

        <Text style={styles.issuedCity}>Medellín, Colombia</Text>
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
