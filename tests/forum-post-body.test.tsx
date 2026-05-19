// Tests del PostBody: render markdown sanitizado. Server
// Component puro (sin hooks), asi que renderToStaticMarkup lo
// renderiza a HTML directamente desde Node.
//
// Objetivo: verificar la garantia de SECURITY.md 403, "react-
// markdown sin allowDangerousHtml": HTML inline en el body
// del user NO se ejecuta ni se renderiza como tags reales.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { PostBody } from "@/modules/forum/components/post-body";

function render(body: string): string {
  return renderToStaticMarkup(<PostBody body={body} />);
}

describe("PostBody markdown rendering", () => {
  it("renderiza negrita y cursiva en HTML", () => {
    const html = render("Texto con **negrita** y _cursiva_.");
    expect(html).toContain("<strong");
    expect(html).toContain("negrita");
    expect(html).toContain("<em");
    expect(html).toContain("cursiva");
  });

  it("renderiza listas unordered con -", () => {
    const html = render("- uno\n- dos\n- tres");
    expect(html).toContain("<ul");
    expect(html.match(/<li/g)?.length).toBe(3);
  });

  it("renderiza links como anchors con target _blank + noopener", () => {
    const html = render("Ver [CNV](https://cnvsystem.com)");
    expect(html).toContain("href=\"https://cnvsystem.com\"");
    expect(html).toContain("target=\"_blank\"");
    expect(html).toContain("rel=\"noopener noreferrer\"");
  });

  it("renderiza inline code", () => {
    const html = render("Usa `cn()` para clases.");
    expect(html).toContain("<code");
    expect(html).toContain("cn()");
  });

  it("renderiza blockquotes", () => {
    const html = render("> Cita importante");
    expect(html).toContain("<blockquote");
    expect(html).toContain("Cita importante");
  });
});

describe("PostBody XSS sanitization", () => {
  it("script tag inline en el body NO se renderiza como elemento script", () => {
    const html = render("Antes <script>alert(1)</script> después");
    expect(html).not.toMatch(/<script\b/i);
    // El texto del script puede aparecer literal o escapado; lo
    // critico es que no sea un tag ejecutable.
    expect(html).not.toContain("alert(1)</script>");
  });

  it("img onerror NO se renderiza como atributo activo", () => {
    const html = render(
      "Texto <img src=x onerror=\"alert(1)\"> mas texto",
    );
    expect(html).not.toMatch(/<img[^>]*onerror=/i);
  });

  it("javascript: URLs en markdown links se neutralizan", () => {
    const html = render("[clickme](javascript:alert(1))");
    // react-markdown defaultUrlTransform filtra schemes peligrosos.
    // El link puede no llevar href o llevar uno seguro; lo critico
    // es que el href NO sea javascript:alert(1).
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it("HTML iframe inline no se renderiza", () => {
    const html = render(
      "Embed <iframe src=\"https://evil.example\"></iframe>",
    );
    expect(html).not.toMatch(/<iframe\b/i);
  });

  it("body vacio no rompe el render", () => {
    expect(() => render("")).not.toThrow();
  });
});
