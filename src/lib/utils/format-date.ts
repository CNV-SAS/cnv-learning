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
//
// Implementacion: Intl.DateTimeFormat.formatToParts con timeZone
// nos da los componentes (year, month, day, hour, minute, second)
// directamente en la zona target. Construimos el string final
// manualmente con abreviaciones de mes en espanol. NO usamos
// date-fns format() sobre un Date reconstruido porque date-fns
// aplica un segundo offset segun la zona del runtime y produce
// resultados incorrectos en runtimes que no esten en UTC.

const TIMEZONE = "America/Bogota";

// Abreviaciones de mes en espanol (3 letras minusculas, sin punto).
// Replica el output de date-fns con locale es para mantener
// consistencia visual con otros formatters (lessons, courses).
const ES_MONTH_SHORT: readonly string[] = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

interface BogotaParts {
  year: string;
  month: number;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function getBogotaParts(isoString: string): BogotaParts {
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

  return {
    year: lookup.year,
    month: Number(lookup.month),
    day: String(Number(lookup.day)),
    hour,
    minute: lookup.minute,
    second: lookup.second,
  };
}

// Formatea timestamp con fecha + hora en zona Bogota.
// Ejemplo: "20 may 2026, 11:42:08".
export function formatBogotaDateTime(isoString: string): string {
  const p = getBogotaParts(isoString);
  const monthLabel = ES_MONTH_SHORT[p.month - 1];
  return `${p.day} ${monthLabel} ${p.year}, ${p.hour}:${p.minute}:${p.second}`;
}

// Formatea timestamp con fecha + hora corta (sin segundos).
// Ejemplo: "20 may 2026, 11:42".
export function formatBogotaDateTimeShort(isoString: string): string {
  const p = getBogotaParts(isoString);
  const monthLabel = ES_MONTH_SHORT[p.month - 1];
  return `${p.day} ${monthLabel} ${p.year}, ${p.hour}:${p.minute}`;
}

// Formatea solo fecha en zona Bogota (sin hora). Usar cuando el
// componente no necesita precision horaria.
// Ejemplo: "20 may 2026".
export function formatBogotaDate(isoString: string): string {
  const p = getBogotaParts(isoString);
  const monthLabel = ES_MONTH_SHORT[p.month - 1];
  return `${p.day} ${monthLabel} ${p.year}`;
}

// Formatea un DATE column de Postgres (string shape "YYYY-MM-DD",
// sin componente horaria) WITHOUT ninguna conversion via Date object.
//
// Fix del bug del smoke B21: pasar "YYYY-MM-DD" a new Date() lo
// interpreta como UTC midnight, que en Bogota (UTC-5) es 19:00 del
// dia anterior. El render mostraba un dia menos.
//
// La solucion correcta: parsear los componentes del string como
// texto (sin Date) y emitir el label directamente. Las DATE
// columns NO tienen timezone semantica, son "fecha calendario";
// cualquier conversion via Date es incorrecta.
//
// Input: "2026-05-15" (o "2026-05-15T..." -- ignora la parte
// despues de T por si llega un timestamp por error).
// Output: "15 may 2026".
export function formatBogotaDateOnly(dateString: string): string {
  const datePart = dateString.split("T")[0];
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const monthIdx = Number(monthStr) - 1;
  const monthLabel =
    ES_MONTH_SHORT[monthIdx] ?? monthStr ?? "";
  const day = String(Number(dayStr) || dayStr);
  return `${day} ${monthLabel} ${yearStr}`;
}
