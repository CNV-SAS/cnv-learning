// Tests del helper de YouTube (lib/youtube). Cubre los 3 formatos de
// URL que el admin podria cargar en lessons.video_url y los edge
// cases de URL invalida.

import { describe, it, expect } from "vitest";
import {
  getYouTubeVideoId,
  getYouTubeEmbedUrl,
} from "@/modules/courses/lib/youtube";

describe("getYouTubeVideoId", () => {
  it("extrae id de youtube.com/watch?v=", () => {
    expect(
      getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("extrae id de youtu.be/", () => {
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extrae id de youtube.com/embed/", () => {
    expect(
      getYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("retorna null para URL no-YouTube", () => {
    expect(getYouTubeVideoId("https://vimeo.com/123456")).toBeNull();
  });

  it("retorna null para string que no es URL", () => {
    expect(getYouTubeVideoId("not-a-url")).toBeNull();
  });

  it("retorna null para watch sin parametro v", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch")).toBeNull();
  });
});

describe("getYouTubeEmbedUrl", () => {
  it("retorna URL embed completa", () => {
    expect(
      getYouTubeEmbedUrl("https://www.youtube.com/watch?v=abc123"),
    ).toBe("https://www.youtube.com/embed/abc123");
  });

  it("retorna null si la URL no es de YouTube", () => {
    expect(getYouTubeEmbedUrl("https://vimeo.com/123")).toBeNull();
  });
});
