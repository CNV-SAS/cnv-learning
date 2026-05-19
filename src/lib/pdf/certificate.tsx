// CertificateDocument: template v1 del certificado en react-pdf.
// Server-rendered: nunca cruza al cliente, sin "use client".
//
// Layout: A4 landscape (842 x 595 pt). Composicion minimal y sobria
// alineada con BRAND.md (Vega + emerald). Sin imagenes externas
// (public/brand sigue vacio en MVP); el wordmark "CNV Learning" es
// texto puro para garantizar fidelidad reproducible y zero asset
// dependency.
//
// Si isRevoked=true, overlay diagonal "REVOCADO" en rojo semi-
// transparente centrado en la pagina (consideracion plan del
// Bloque 12: permitir descarga + watermark para que el PDF
// fisico/digital fuera-de-BD muestre el estado).
//
// El QR (props.qrDataUrl) ya viene generado por lib/pdf/qr.ts
// como data URL PNG.

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
  emerald: "#047857",
  emeraldLight: "#ecfdf5",
  border: "#cbd5e1",
  white: "#ffffff",
  revokedRed: "#dc2626",
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: COLORS.white,
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  borderFrame: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "solid",
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 32,
  },
  wordmarkPrimary: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.emerald,
    letterSpacing: 1,
  },
  wordmarkSecondary: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    letterSpacing: 1,
  },
  bodyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  certificateLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.emerald,
    letterSpacing: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 32,
  },
  leadIn: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  studentName: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  middleText: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  courseName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.emerald,
    marginBottom: 28,
    textAlign: "center",
  },
  dateText: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 24,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qrImage: {
    width: 70,
    height: 70,
  },
  footerCopy: {
    flexDirection: "column",
  },
  footerCopyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerCopyValue: {
    fontSize: 9,
    color: COLORS.text,
  },
  footerCopyValueMono: {
    fontSize: 8,
    fontFamily: "Courier",
    color: COLORS.text,
    marginTop: 4,
  },
  watermark: {
    position: "absolute",
    top: 220,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 120,
    fontFamily: "Helvetica-Bold",
    color: COLORS.revokedRed,
    opacity: 0.18,
    letterSpacing: 12,
    transform: "rotate(-12deg)",
  },
});

interface CertificateDocumentProps {
  studentName: string;
  courseName: string;
  issuedAtLabel: string;
  certificateIdShort: string;
  hashShort: string;
  verifyUrl: string;
  qrDataUrl: string;
  isRevoked: boolean;
}

export function CertificateDocument(props: CertificateDocumentProps) {
  return (
    <Document
      title={`Certificado ${props.certificateIdShort}`}
      author="CNV Learning"
      subject={`Certificado de finalizacion de ${props.courseName}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.borderFrame} />

        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkPrimary}>CNV</Text>
          <Text style={styles.wordmarkSecondary}>LEARNING</Text>
        </View>

        <View style={styles.bodyCenter}>
          <Text style={styles.certificateLabel}>
            CERTIFICADO DE FINALIZACION
          </Text>
          <Text style={styles.title}>Reconocimiento académico</Text>

          <Text style={styles.leadIn}>Se hace constar que</Text>
          <Text style={styles.studentName}>{props.studentName}</Text>

          <Text style={styles.middleText}>
            completó satisfactoriamente el curso
          </Text>
          <Text style={styles.courseName}>{props.courseName}</Text>

          <Text style={styles.dateText}>
            Emitido el {props.issuedAtLabel}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image no soporta alt */}
            <Image src={props.qrDataUrl} style={styles.qrImage} />
            <View style={styles.footerCopy}>
              <Text style={styles.footerCopyLabel}>
                VERIFICA ESTE CERTIFICADO
              </Text>
              <Text style={styles.footerCopyValue}>{props.verifyUrl}</Text>
              <Text style={styles.footerCopyValueMono}>
                ID {props.certificateIdShort} · Hash {props.hashShort}
              </Text>
            </View>
          </View>
        </View>

        {props.isRevoked && (
          <Text style={styles.watermark}>REVOCADO</Text>
        )}
      </Page>
    </Document>
  );
}
