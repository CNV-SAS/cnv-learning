"use client";

// ProfileForm: form para editar campos del propio perfil.
//
// 22.15: full_name dejo de ser editable por el user (motivo:
// fraude potencial post-emision de certs corporativos). Ahora se
// muestra como texto plano con una nota dirigiendo al admin.
// Quedan 4 campos editables: bio, professional_license, institution,
// specialization. El avatar se gestiona en AvatarUpload separado.
//
// Controlled state + toast feedback (patron de admin dialogs); sin
// react-hook-form aqui para mantener el componente simple. Field
// validation cliente via maxLength/minLength + server valida con Zod.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileAction } from "@/modules/profile/server/update-profile.action";
import type { Profile } from "@/modules/auth/types";

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [bio, setBio] = useState(profile.bio ?? "");
  const [professionalLicense, setProfessionalLicense] = useState(
    profile.professional_license ?? "",
  );
  const [institution, setInstitution] = useState(profile.institution ?? "");
  const [specialization, setSpecialization] = useState(
    profile.specialization ?? "",
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfileAction({
        bio: bio.trim() || undefined,
        professionalLicense: professionalLicense.trim() || undefined,
        institution: institution.trim() || undefined,
        specialization: specialization.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Perfil actualizado.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-display text-base font-bold tracking-tight">
          Información personal
        </h3>
        <div className="space-y-2">
          <Label htmlFor="profile-fullname">Nombre completo</Label>
          <Input
            id="profile-fullname"
            value={profile.full_name}
            readOnly
            disabled
            aria-readonly
          />
          <p className="text-xs text-muted-foreground">
            El nombre no puede modificarse desde la app porque aparece
            en los certificados emitidos. Si necesitas cambiarlo,
            contacta con un administrador en{" "}
            <a
              href="mailto:soporte@cnvsystem.com"
              className="underline hover:text-foreground"
            >
              soporte@cnvsystem.com
            </a>
            .
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-bio">Biografía (opcional)</Label>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={1000}
            disabled={isPending}
            placeholder="Cuéntanos brevemente sobre ti."
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-base font-bold tracking-tight">
          Información profesional
        </h3>
        <div className="space-y-2">
          <Label htmlFor="profile-license">
            Número de licencia profesional (opcional)
          </Label>
          <Input
            id="profile-license"
            value={professionalLicense}
            onChange={(e) => setProfessionalLicense(e.target.value)}
            maxLength={100}
            disabled={isPending}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-institution">Institución (opcional)</Label>
            <Input
              id="profile-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={200}
              disabled={isPending}
              placeholder="Universidad, hospital, clínica."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-specialization">
              Especialización (opcional)
            </Label>
            <Input
              id="profile-specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              maxLength={200}
              disabled={isPending}
              placeholder="Área principal de práctica."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
