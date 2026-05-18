// YouTube URL helpers. Acepta las 3 formas tipicas con las que el
// admin podria cargar `lessons.video_url`:
//   - https://www.youtube.com/watch?v=VIDEO_ID
//   - https://youtu.be/VIDEO_ID
//   - https://www.youtube.com/embed/VIDEO_ID
//
// Devuelve null si la URL es invalida o no es de YouTube; el caller
// decide la fallback UI (placeholder "Video no disponible").

export function getYouTubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // youtube.com / m.youtube.com / www.youtube.com
  if (url.hostname.endsWith("youtube.com")) {
    const watchId = url.searchParams.get("v");
    if (watchId) return watchId;

    const embedMatch = url.pathname.match(/^\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
  }

  // youtu.be/VIDEO_ID
  if (url.hostname === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id || null;
  }

  return null;
}

export function getYouTubeEmbedUrl(rawUrl: string): string | null {
  const id = getYouTubeVideoId(rawUrl);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
