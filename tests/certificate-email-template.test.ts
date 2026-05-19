// Tests del template puro de email de certificate. Verifica
// subject por kind, presencia de campos en HTML + text, escape
// HTML basico del motivo de revocacion.

import { describe, it, expect } from "vitest";
import { certificateNotificationTemplate } from "@/lib/email";

const baseIssued = {
  kind: "issued" as const,
  studentName: "Santiago Uribe",
  courseTitle: "Diplomado de Medicina Bioeléctrica",
  pdfUrl: "https://lms.cnvsystem.com/api/certificates/abc/pdf",
  verifyUrl: "https://lms.cnvsystem.com/verify/abc",
};

const baseRevoked = {
  kind: "revoked" as const,
  studentName: "Santiago Uribe",
  courseTitle: "Diplomado de Medicina Bioeléctrica",
  verifyUrl: "https://lms.cnvsystem.com/verify/abc",
  reason: "Inconsistencia en datos académicos detectada.",
};

describe("certificateNotificationTemplate issued", () => {
  it("subject incluye 'esta listo' + course title", () => {
    const { subject } = certificateNotificationTemplate(baseIssued);
    expect(subject).toContain("Tu certificado de");
    expect(subject).toContain("Diplomado de Medicina Bioeléctrica");
    expect(subject).toContain("está listo");
  });

  it("HTML contiene CTA al pdfUrl", () => {
    const { html } = certificateNotificationTemplate(baseIssued);
    expect(html).toContain(baseIssued.pdfUrl);
    expect(html).toContain("Descargar certificado");
  });

  it("HTML contiene link al verifyUrl", () => {
    const { html } = certificateNotificationTemplate(baseIssued);
    expect(html).toContain(baseIssued.verifyUrl);
  });

  it("text incluye pdfUrl + verifyUrl + courseTitle", () => {
    const { text } = certificateNotificationTemplate(baseIssued);
    expect(text).toContain(baseIssued.pdfUrl);
    expect(text).toContain(baseIssued.verifyUrl);
    expect(text).toContain(baseIssued.courseTitle);
  });
});

describe("certificateNotificationTemplate revoked", () => {
  it("subject incluye 'fue revocado' + course title", () => {
    const { subject } = certificateNotificationTemplate(baseRevoked);
    expect(subject).toContain("Tu certificado de");
    expect(subject).toContain("Diplomado de Medicina Bioeléctrica");
    expect(subject).toContain("fue revocado");
  });

  it("HTML contiene el motivo de revocacion", () => {
    const { html } = certificateNotificationTemplate(baseRevoked);
    expect(html).toContain(baseRevoked.reason);
  });

  it("HTML NO contiene pdfUrl (cert revocado no se promueve descarga)", () => {
    const { html } = certificateNotificationTemplate(baseRevoked);
    expect(html).not.toContain("/api/certificates/");
    expect(html).not.toContain("Descargar certificado");
  });

  it("HTML escapa < > & en el motivo (defensa basica)", () => {
    const { html } = certificateNotificationTemplate({
      ...baseRevoked,
      reason: "Detectamos <script>alert(1)</script> & errores.",
    });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&amp; errores");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("text incluye reason + verifyUrl", () => {
    const { text } = certificateNotificationTemplate(baseRevoked);
    expect(text).toContain(baseRevoked.reason);
    expect(text).toContain(baseRevoked.verifyUrl);
  });
});
