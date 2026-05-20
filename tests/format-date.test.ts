// Tests del helper de timezone Bogota (Bloque 14.12 fix BUG 5).
// Validamos que un timestamp UTC se renderiza en hora local de
// Colombia (UTC-5, sin DST).

import { describe, it, expect } from "vitest";
import {
  formatBogotaDate,
  formatBogotaDateTime,
  formatBogotaDateTimeShort,
} from "@/lib/utils/format-date";

describe("formatBogotaDateTime", () => {
  it("convierte UTC a hora Bogota (UTC-5)", () => {
    // 16:42:08 UTC -> 11:42:08 en Bogota (UTC-5).
    const iso = "2026-05-20T16:42:08.000Z";
    expect(formatBogotaDateTime(iso)).toBe("20 may 2026, 11:42:08");
  });

  it("maneja medianoche UTC cruzando dia hacia atras", () => {
    // 02:00:00 UTC del 21 -> 21:00:00 del 20 en Bogota.
    const iso = "2026-05-21T02:00:00.000Z";
    expect(formatBogotaDateTime(iso)).toBe("20 may 2026, 21:00:00");
  });

  it("maneja noche temprano cruzando dia hacia adelante (no aplica para Bogota)", () => {
    // 04:30:00 UTC -> 23:30:00 del dia anterior en Bogota.
    const iso = "2026-05-20T04:30:00.000Z";
    expect(formatBogotaDateTime(iso)).toBe("19 may 2026, 23:30:00");
  });
});

describe("formatBogotaDateTimeShort", () => {
  it("incluye HH:mm pero NO segundos", () => {
    const iso = "2026-05-20T16:42:08.000Z";
    expect(formatBogotaDateTimeShort(iso)).toBe("20 may 2026, 11:42");
  });
});

describe("formatBogotaDate", () => {
  it("renderiza solo la fecha (sin hora) en zona Bogota", () => {
    const iso = "2026-05-20T16:42:08.000Z";
    expect(formatBogotaDate(iso)).toBe("20 may 2026");
  });

  it("usa la fecha de Bogota, no la UTC, en limites de dia", () => {
    // 04:00:00 UTC del 21 -> 23:00:00 del 20 en Bogota.
    // El helper debe respetar la fecha LOCAL de Bogota.
    const iso = "2026-05-21T04:00:00.000Z";
    expect(formatBogotaDate(iso)).toBe("20 may 2026");
  });
});
