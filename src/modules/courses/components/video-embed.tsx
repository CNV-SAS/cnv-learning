// VideoEmbed: iframe responsive de YouTube. Server Component
// (sin estado ni efectos). Si la URL no es parseable como YouTube,
// muestra placeholder "Video no disponible" sin reventar la pagina.
//
// Wrapper aspect-video + rounded-2xl mantiene el ratio 16:9 sin
// importar el ancho del contenedor padre. allowFullScreen habilita
// el modo pantalla completa nativo del navegador.

import { getYouTubeEmbedUrl } from "../lib/youtube";

interface VideoEmbedProps {
  videoUrl: string;
}

export function VideoEmbed({ videoUrl }: VideoEmbedProps) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-muted">
        <p className="text-sm text-muted-foreground">
          Video no disponible
        </p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted">
      <iframe
        src={embedUrl}
        title="Video de la lección"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
