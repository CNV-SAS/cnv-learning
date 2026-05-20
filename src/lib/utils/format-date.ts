// Helpers de formateo de fechas con zona horaria explicita.
//
// HARDCODED a "America/Bogota" para el MVP: CNV opera 100% desde
// Colombia y todos los usuarios estan en esa zona horaria. Si en
// v2 se expande a otros paises, evaluar:
//   - leer timezone desde profiles.timezone (columna a agregar),
//   - o detectar Intl.DateTimeFormat().resolvedOptions().timeZone
//     del browser (client only),
// y pasar la zona como parametro a estos helpers.
//
// Fix del BUG 5 del smoke 14: el audit log renderizaba created_at
// en UTC (la zona default del servidor Vercel) lo cual hacia
// imposible correlacionar eventos con la hora real de Colombia.

import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIMEZONE = "America/Bogota";

// Convierte un ISO string (que es UTC por convencion de Supabase)
// a la zona Bogota como Date. Por debajo, Intl.DateTimeFormat parte
// el instante en componentes de la zona destino; reconstruimos un
// Date "como si" fuera UTC pero con los componentes locales, lo
// cual permite usar date-fns format() sobre el resultado sin que
// re-aplique la zona del runtime.
//
// El truco: parsear los parts y armar una fecha con
// Date.UTC(year, month-1, day, hour, minute, second) — el Date
// resultante representa el mismo wall-time pero "virtualmente
// UTC" para date-fns.
function toBogotaWallTime(isoString: string): Date {
  const source = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(source);

  const lookup = Object.fromEntries(
    parts.map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  // hour viene como "24" si es medianoche en algunos entornos;
  // normalizamos a "00".
  const hour = lookup.hour === "24" ? "00" : lookup.hour;

  return new Date(
    Date.UTC(
      Number(lookup.year),
      Number(lookup.month) - 1,
      Number(lookup.day),
      Number(hour),
      Number(lookup.minute),
      Number(lookup.second),
    ),
  );
}

// Formatea timestamp con fecha + hora en zona Bogota.
// Ejemplo: "20 may 2026, 16:42:08".
export function formatBogotaDateTime(isoString: string): string {
  const wallTime = toBogotaWallTime(isoString);
  return format(wallTime, "d MMM y, HH:mm:ss", { locale: es });
}

// Formatea timestamp con fecha + hora corta (sin segundos).
// Ejemplo: "20 may 2026, 16:42".
export function formatBogotaDateTimeShort(isoString: string): string {
  const wallTime = toBogotaWallTime(isoString);
  return format(wallTime, "d MMM y, HH:mm", { locale: es });
}

// Formatea solo fecha en zona Bogota (sin hora). Usar cuando el
// componente no necesita precision horaria.
// Ejemplo: "20 may 2026".
export function formatBogotaDate(isoString: string): string {
  const wallTime = toBogotaWallTime(isoString);
  return format(wallTime, "d MMM y", { locale: es });
}
