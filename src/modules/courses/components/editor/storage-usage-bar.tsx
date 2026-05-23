// StorageUsageBar (Bloque 20.2): muestra la cuota usada del curso
// con barra visual + label "Usado: X MB / 500 MB". Color del bar:
// emerald <70%, amber 70-89%, destructive >=90%.
//
// Server Component: recibe los bytes ya calculados por el service.
// No tiene estado ni interactividad.

import {
  COURSE_STORAGE_QUOTA_BYTES,
  formatBytes,
} from "@/modules/courses/data/course-resource-constants";

interface StorageUsageBarProps {
  usedBytes: number;
}

export function StorageUsageBar({ usedBytes }: StorageUsageBarProps) {
  const totalBytes = COURSE_STORAGE_QUOTA_BYTES;
  const pct = Math.min(100, (usedBytes / totalBytes) * 100);
  const overQuota = usedBytes > totalBytes;

  let barColor = "bg-emerald-500";
  if (pct >= 90) barColor = "bg-destructive";
  else if (pct >= 70) barColor = "bg-amber-500";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">
          Almacenamiento del curso
        </span>
        <span
          className={
            overQuota
              ? "text-destructive font-semibold"
              : "text-muted-foreground"
          }
        >
          {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overQuota && (
        <p className="text-xs text-destructive">
          El curso excede la cuota. Elimina recursos antes de subir nuevos.
        </p>
      )}
    </div>
  );
}
