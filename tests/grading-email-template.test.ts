// Tests del template puro de email de calificacion publicada.
// Verifica que el HTML y el text contienen los campos esperados,
// y que el escape basico funciona (< > & + saltos de linea).

import { describe, it, expect } from "vitest";
import { gradingPublishedTemplate } from "@/lib/email/templates/grading-published";

const baseParams = {
  studentName: "Santiago Uribe",
  courseTitle: "Diplomado en Medicina Bioeléctrica",
  assignmentTitle: "Ensayo final",
  finalGrade: 85,
  maxScore: 100,
  feedback: "Buen trabajo. Profundiza más en la teoría.",
  assignmentUrl: "https://lms.cnvsystem.com/learn/abc/assignment/xyz",
};

describe("gradingPublishedTemplate", () => {
  it("subject incluye el assignment title", () => {
    const { subject } = gradingPublishedTemplate(baseParams);
    expect(subject).toBe("Recibiste tu calificación en Ensayo final");
  });

  it("HTML contiene studentName, course, grade, feedback y link", () => {
    const { html } = gradingPublishedTemplate(baseParams);
    expect(html).toContain("Santiago Uribe");
    expect(html).toContain("Diplomado en Medicina Bioeléctrica");
    expect(html).toContain("Ensayo final");
    expect(html).toContain(">85<");
    expect(html).toContain("/ 100");
    expect(html).toContain("Buen trabajo");
    expect(html).toContain(
      "https://lms.cnvsystem.com/learn/abc/assignment/xyz",
    );
  });

  it("text contiene los mismos campos en formato plano", () => {
    const { text } = gradingPublishedTemplate(baseParams);
    expect(text).toContain("Santiago Uribe");
    expect(text).toContain("Diplomado en Medicina Bioeléctrica");
    expect(text).toContain("Ensayo final");
    expect(text).toContain("85 / 100");
    expect(text).toContain("Buen trabajo");
    expect(text).toContain(baseParams.assignmentUrl);
  });

  it("HTML escapa < > & del feedback (defensa basica)", () => {
    const { html } = gradingPublishedTemplate({
      ...baseParams,
      feedback: "Excelente uso de <code>algo</code> & símbolos.",
    });
    expect(html).toContain("&lt;code&gt;algo&lt;/code&gt;");
    expect(html).toContain("&amp; símbolos");
    expect(html).not.toContain("<code>algo</code>");
  });

  it("HTML preserva saltos de linea del feedback como <br>", () => {
    const { html } = gradingPublishedTemplate({
      ...baseParams,
      feedback: "Línea 1\nLínea 2\nLínea 3",
    });
    expect(html).toContain("Línea 1<br>Línea 2<br>Línea 3");
  });
});
