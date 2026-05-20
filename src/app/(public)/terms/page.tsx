// /terms: Terminos de Uso del LMS. Pagina publica.
//
// Contenido definitivo proporcionado por Santiago el 2026-05-20.
// Fecha de "ultima actualizacion" sigue el mismo principio que
// /privacy: hardcoded al commit que actualizo el contenido.

export const metadata = {
  title: "Términos de Uso · CNV Learning",
  description:
    "Términos y condiciones de uso de la plataforma CNV Learning.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Términos de Uso
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: 20 de mayo de 2026
        </p>
      </header>

      <p className="text-sm leading-relaxed">
        Las siguientes condiciones regulan el acceso y uso de la
        plataforma de formación CNV Learning (lms.cnvsystem.com),
        operada por CONNECTED NUTRITION VENTURES S.A.S.
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          1. Objeto
        </h2>
        <p className="text-sm leading-relaxed">
          CNV Learning es una plataforma educativa en línea destinada
          exclusivamente a participantes del Diplomado en Medicina
          Bioeléctrica y Sistema ANI BIS-E, desarrollado por CONNECTED
          NUTRITION VENTURES S.A.S.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          2. Acceso y Uso de la Plataforma
        </h2>
        <p className="text-sm leading-relaxed">
          El acceso a la plataforma es personal e intransferible. El
          participante se compromete a:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>No compartir sus credenciales de acceso con terceros.</li>
          <li>
            Utilizar la plataforma de manera lícita y conforme a su
            propósito académico.
          </li>
          <li>
            No intentar acceder a funcionalidades o datos de otros
            usuarios sin autorización.
          </li>
          <li>
            No reproducir, distribuir ni comercializar los contenidos
            del programa sin autorización expresa de CNV.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          3. Propiedad Intelectual
        </h2>
        <p className="text-sm leading-relaxed">
          Todos los contenidos de la plataforma (materiales de curso,
          lecciones, metodologías, sistema ANI BIS-E, índices clínicos
          IFC, IRC, PABU y demás indicadores) son propiedad exclusiva
          de CONNECTED NUTRITION VENTURES S.A.S. y/o de sus autores,
          con todos los derechos reservados. Queda prohibida su
          reproducción total o parcial sin autorización escrita.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          4. Naturaleza Académica del Contenido
        </h2>
        <p className="text-sm leading-relaxed">
          Los contenidos de este programa son de carácter educativo y
          de formación profesional en el área de nutrición clínica y
          bioimpedancia espectroscópica. Ningún contenido debe
          interpretarse como diagnóstico médico, tratamiento,
          prescripción o recomendación clínica individualizada para
          pacientes específicos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          5. Certificados
        </h2>
        <p className="text-sm leading-relaxed">
          Los certificados emitidos por CNV Learning acreditan la
          participación y/o aprobación del programa. CNV se reserva el
          derecho de revocar certificados emitidos en caso de
          detectarse irregularidades en el proceso de evaluación.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          6. Limitación de Responsabilidad
        </h2>
        <p className="text-sm leading-relaxed">
          CNV adopta medidas razonables para garantizar la
          disponibilidad de la plataforma, pero no garantiza su
          funcionamiento ininterrumpido. CNV no será responsable por
          daños derivados de interrupciones técnicas, pérdida de
          conectividad o causas de fuerza mayor.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          7. Modificaciones
        </h2>
        <p className="text-sm leading-relaxed">
          CNV podrá modificar estos términos notificando a los
          participantes activos por los canales de comunicación de la
          plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          8. Jurisdicción
        </h2>
        <p className="text-sm leading-relaxed">
          Este documento se rige por las leyes de la República de
          Colombia.
        </p>
      </section>
    </article>
  );
}
