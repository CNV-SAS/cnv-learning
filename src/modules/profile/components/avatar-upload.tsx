"use client";

// AvatarUpload: componente cliente para subir/reemplazar/quitar
// la foto de perfil. Sube el blob directamente a Supabase Storage
// (decision F del plan B16) desde el browser, luego invoca
// updateAvatarAction con la URL publica.
//
// Validacion cliente (decision D):
//   - Tipo MIME: image/jpeg, image/png, image/webp.
//   - Tamano max: 2 MB.
//
// Path convencion (RLS bucket avatars, migracion 0015): el primer
// segmento debe ser auth.uid()::text. Generamos
// `${userId}/${uuid}.${ext}` en cada upload (no reusar filename:
// el UUID nuevo da cache-busting automatico, consideracion A3).
//
// El componente renderiza:
//   - Preview circular (current avatar o iniciales fallback).
//   - Boton "Subir foto" (input file hidden + label trigger).
//   - Boton "Quitar foto" si ya hay un avatar.

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { updateAvatarAction } from "@/modules/profile/server/update-avatar.action";
import { removeAvatarAction } from "@/modules/profile/server/remove-avatar.action";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

interface AvatarUploadProps {
  userId: string;
  initialAvatarUrl: string | null;
  initials: string;
}

export function AvatarUpload({
  userId,
  initialAvatarUrl,
  initials,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, startRemoveTransition] = useTransition();

  function handleClickUpload() {
    inputRef.current?.click();
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value para permitir re-seleccionar el mismo archivo
    // tras un fallo (browsers no disparan change si el value no cambio).
    if (inputRef.current) inputRef.current.value = "";

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Tipo de imagen no permitido. Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("La imagen no puede superar 2 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.${extFromMime(file.type)}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        toast.error("No fue posible subir la imagen. Intenta de nuevo.");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const result = await updateAvatarAction({ avatarUrl: publicUrl });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      setAvatarUrl(publicUrl);
      toast.success("Foto actualizada.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setAvatarUrl(null);
      toast.success("Foto eliminada.");
    });
  }

  const busy = isUploading || isRemoving;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Foto de perfil"
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={busy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClickUpload}
            disabled={busy}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-2 h-3.5 w-3.5" />
            )}
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={busy}
            >
              {isRemoving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-3.5 w-3.5" />
              )}
              Quitar foto
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG o WebP. Máximo 2 MB.
        </p>
      </div>
    </div>
  );
}
