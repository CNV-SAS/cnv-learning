// Tests del helper puro sanitizeFilename del modulo assignments.
// Cubre el flow de uploads: nombre con acentos, espacios,
// parentesis, sin extension, extension vacia, leading dot,
// nombre vacio.

import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "@/modules/assignments/data/submission-storage";

describe("sanitizeFilename", () => {
  it("nombre con acentos y parentesis: slug + ext lowercase", () => {
    expect(sanitizeFilename("Mi Tarea Final (versión 2).pdf")).toBe(
      "mi-tarea-final-version-2.pdf",
    );
  });

  it("nombre simple", () => {
    expect(sanitizeFilename("archivo.pdf")).toBe("archivo.pdf");
  });

  it("DOCX en mayusculas: lowercase y conserva", () => {
    expect(sanitizeFilename("Reporte.DOCX")).toBe("reporte.docx");
  });

  it("sin extension: slug del todo, sin punto", () => {
    expect(sanitizeFilename("Archivo Sin Extension")).toBe(
      "archivo-sin-extension",
    );
  });

  it("nombre vacio: fallback 'archivo'", () => {
    expect(sanitizeFilename("")).toBe("archivo");
  });

  it("solo especiales: fallback 'archivo' sin ext", () => {
    expect(sanitizeFilename("!!!")).toBe("archivo");
  });

  it("solo especiales con ext: 'archivo' + ext", () => {
    expect(sanitizeFilename("!!!.pdf")).toBe("archivo.pdf");
  });

  it("leading dot (.gitignore): tratado como sin ext", () => {
    expect(sanitizeFilename(".gitignore")).toBe("gitignore");
  });

  it("doble extension: solo la ultima cuenta", () => {
    expect(sanitizeFilename("backup.tar.gz")).toBe("backup-tar.gz");
  });
});
