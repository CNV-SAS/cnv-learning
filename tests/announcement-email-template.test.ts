// Tests del template puro de email de announcement. Verifica que
// el subject diferencia por scope (consideracion C del plan del
// Bloque 10), que el body se trata como plain text con escape HTML
// basico, y que el text alternativo contiene los campos esperados.

import { describe, it, expect } from "vitest";
import { announcementTemplate } from "@/lib/email";

const baseParams = {
  recipientName: "Santiago Uribe",
  authorName: "Dr. Gildardo Sarro",
  title: "Recordatorio importante",
  body: "Por favor revisen el material antes del próximo lunes.",
  appUrl: "https://lms.cnvsystem.com",
};

describe("announcementTemplate subject", () => {
  it("course scope usa 'Nuevo anuncio: {title}'", () => {
    const { subject } = announcementTemplate({
      ...baseParams,
      scope: "course",
      courseTitle: "Diplomado",
    });
    expect(subject).toBe("Nuevo anuncio: Recordatorio importante");
  });

  it("global scope usa 'Anuncio global: {title}'", () => {
    const { subject } = announcementTemplate({
      ...baseParams,
      scope: "global",
    });
    expect(subject).toBe("Anuncio global: Recordatorio importante");
  });
});

describe("announcementTemplate HTML body", () => {
  it("contiene recipientName, authorName y title", () => {
    const { html } = announcementTemplate({
      ...baseParams,
      scope: "course",
      courseTitle: "Diplomado",
    });
    expect(html).toContain("Santiago Uribe");
    expect(html).toContain("Dr. Gildardo Sarro");
    expect(html).toContain("Recordatorio importante");
  });

  it("course scope muestra courseTitle en la card", () => {
    const { html } = announcementTemplate({
      ...baseParams,
      scope: "course",
      courseTitle: "Diplomado en Medicina Bioeléctrica",
    });
    expect(html).toContain("Diplomado en Medicina Bioeléctrica");
  });

  it("global scope muestra label 'Anuncio global' en la card", () => {
    const { html } = announcementTemplate({
      ...baseParams,
      scope: "global",
    });
    expect(html).toContain("Anuncio global");
  });

  it("escapa < > & del body (defensa basica)", () => {
    const { html } = announcementTemplate({
      ...baseParams,
      scope: "global",
      body: "Atención: <script>alert(1)</script> & símbolos.",
    });
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&amp; símbolos");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("preserva saltos de linea del body como <br>", () => {
    const { html } = announcementTemplate({
      ...baseParams,
      scope: "global",
      body: "Línea 1\nLínea 2\nLínea 3",
    });
    expect(html).toContain("Línea 1<br>Línea 2<br>Línea 3");
  });
});

describe("announcementTemplate text alternative", () => {
  it("contiene recipientName, authorName, title y body", () => {
    const { text } = announcementTemplate({
      ...baseParams,
      scope: "course",
      courseTitle: "Diplomado",
    });
    expect(text).toContain("Santiago Uribe");
    expect(text).toContain("Dr. Gildardo Sarro");
    expect(text).toContain("Recordatorio importante");
    expect(text).toContain(baseParams.body);
  });

  it("course scope incluye linea 'Curso: ...'", () => {
    const { text } = announcementTemplate({
      ...baseParams,
      scope: "course",
      courseTitle: "Diplomado en Medicina Bioeléctrica",
    });
    expect(text).toContain("Curso: Diplomado en Medicina Bioeléctrica");
  });

  it("global scope NO incluye linea de curso", () => {
    const { text } = announcementTemplate({
      ...baseParams,
      scope: "global",
    });
    expect(text).not.toContain("Curso:");
  });

  it("incluye el appUrl como link sin transformacion", () => {
    const customUrl = "https://staging.cnvsystem.com";
    const { text } = announcementTemplate({
      ...baseParams,
      scope: "global",
      appUrl: customUrl,
    });
    expect(text).toContain(customUrl);
  });
});
