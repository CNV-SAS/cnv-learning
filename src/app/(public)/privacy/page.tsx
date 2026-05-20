// /privacy: Politica de Tratamiento de Datos Personales del LMS.
// Pagina publica (no requiere sesion). Layout (public) provee
// header con wordmark + footer con links.
//
// Contenido definitivo proporcionado por Santiago el 2026-05-20,
// adaptado al LMS del Diplomado (datos academicos: progreso,
// entregas, calificaciones, certificados). No es placeholder.
//
// Fecha de "ultima actualizacion" hardcodeada al push del Bloque
// 17. Si el contenido cambia en futuro, actualizar la fecha en
// el mismo commit que modifica el texto (es semantica de
// compliance: refleja CUANDO se actualizo el documento).

export const metadata = {
  title: "Política de Tratamiento de Datos Personales · CNV Learning",
  description:
    "Política de Tratamiento de Datos Personales de CNV Learning (lms.cnvsystem.com).",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-black tracking-tight">
          Política de Tratamiento de Datos Personales
        </h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: 20 de mayo de 2026
        </p>
      </header>

      <p className="text-sm leading-relaxed">
        En cumplimiento de la normativa vigente en materia de protección
        de datos, CONNECTED NUTRITION VENTURES S.A.S. presenta su
        política para el manejo de información personal en la
        plataforma de formación CNV Learning (lms.cnvsystem.com).
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          1. Identificación del Responsable
        </h2>
        <ul className="space-y-1 text-sm leading-relaxed">
          <li>
            <span className="font-medium">Razón Social:</span> CONNECTED
            NUTRITION VENTURES S.A.S.
          </li>
          <li>
            <span className="font-medium">NIT:</span> 902045562
          </li>
          <li>
            <span className="font-medium">Domicilio:</span> Medellín, Colombia
          </li>
          <li>
            <span className="font-medium">Correo de contacto:</span>{" "}
            <a
              href="mailto:protecciondatos@cnvsystem.com"
              className="underline hover:text-foreground"
            >
              protecciondatos@cnvsystem.com
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          2. Marco Normativo
        </h2>
        <p className="text-sm leading-relaxed">
          La presente política se rige por la Ley 1581 de 2012 y el
          Decreto 1074 de 2015 de la República de Colombia, así como
          por buenas prácticas y estándares internacionales en materia
          de protección de datos personales.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          3. Principios Rectores
        </h2>
        <p className="text-sm leading-relaxed">
          CNV aplicará de manera armónica e integral los siguientes
          principios: Legalidad, Finalidad, Libertad, Veracidad o
          Calidad, Transparencia, Acceso y Circulación Restringida,
          Seguridad y Confidencialidad.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          4. Definiciones Clave
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed">
          <li>
            <span className="font-medium">Dato personal:</span> cualquier
            información vinculada o que pueda asociarse a una o varias
            personas naturales determinadas o determinables.
          </li>
          <li>
            <span className="font-medium">Titular:</span> persona natural
            cuyos datos personales sean objeto de Tratamiento.
          </li>
          <li>
            <span className="font-medium">Tratamiento:</span> cualquier
            operación o conjunto de operaciones sobre datos personales.
          </li>
          <li>
            <span className="font-medium">Encargado del Tratamiento:</span>{" "}
            persona o entidad que realiza el Tratamiento de datos por
            cuenta del Responsable.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          5. Finalidades del Tratamiento
        </h2>
        <p className="text-sm leading-relaxed">
          Los datos personales recolectados a través de CNV Learning
          serán utilizados estrictamente para:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>
            Gestionar el acceso, la autenticación y la seguridad de la
            plataforma.
          </li>
          <li>
            Realizar seguimiento del progreso académico del participante
            (lecciones completadas, calificaciones, asistencia a módulos).
          </li>
          <li>
            Emitir certificados de participación y/o aprobación
            verificables.
          </li>
          <li>
            Enviar comunicaciones académicas relacionadas con el
            programa (anuncios del docente, notificaciones de
            calificación, recordatorios).
          </li>
          <li>Cumplir con obligaciones legales y auditorías internas.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          6. Datos Recolectados
        </h2>
        <p className="text-sm leading-relaxed">
          La plataforma recolecta y trata los siguientes datos:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>
            <span className="font-medium">Datos de identificación:</span>{" "}
            nombre completo, correo electrónico.
          </li>
          <li>
            <span className="font-medium">Datos académicos:</span> progreso
            en lecciones, entregas de tareas, resultados de
            evaluaciones, certificados emitidos.
          </li>
          <li>
            <span className="font-medium">Datos de perfil opcionales:</span>{" "}
            institución, especialización, licencia profesional,
            fotografía de perfil.
          </li>
          <li>
            <span className="font-medium">Datos técnicos:</span> registros
            de actividad en la plataforma (audit logs) para seguridad e
            integridad del sistema.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          7. Transferencia y Transmisión Internacional de Datos
        </h2>
        <p className="text-sm leading-relaxed">
          Para garantizar la operación técnica de la plataforma, el
          tratamiento podrá implicar la transmisión de datos personales
          a los siguientes proveedores tecnológicos:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>
            Supabase Inc. (base de datos y autenticación, EE.UU.)
          </li>
          <li>Vercel Inc. (hospedaje y despliegue, EE.UU.)</li>
          <li>
            Resend Inc. (envío de correos transaccionales, EE.UU.)
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          Dichos proveedores actúan como encargados del tratamiento bajo
          obligaciones de confidencialidad y con estándares adecuados de
          protección de la información.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          8. Derechos del Titular
        </h2>
        <p className="text-sm leading-relaxed">
          Como titular de sus datos, usted tiene derecho a:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>Conocer, actualizar y rectificar sus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Ser informado respecto del uso dado a sus datos.</li>
          <li>
            Revocar la autorización y/o solicitar la supresión del dato
            cuando no se respeten los principios legales.
          </li>
          <li>
            Presentar quejas ante la Superintendencia de Industria y
            Comercio (SIC).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          9. Procedimiento para el Ejercicio de Derechos
        </h2>
        <p className="text-sm leading-relaxed">
          Las consultas y reclamos deberán ser enviados al correo
          electrónico:{" "}
          <a
            href="mailto:protecciondatos@cnvsystem.com"
            className="underline hover:text-foreground"
          >
            protecciondatos@cnvsystem.com
          </a>
          .
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          <li>
            <span className="font-medium">Consultas:</span> máximo diez
            (10) días hábiles.
          </li>
          <li>
            <span className="font-medium">Reclamos:</span> máximo quince
            (15) días hábiles.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          10. Seguridad de la Información
        </h2>
        <p className="text-sm leading-relaxed">
          CNV Learning implementa medidas técnicas, administrativas y
          organizacionales para proteger los datos personales:
          autenticación segura, gestión de accesos basada en roles,
          cifrado en tránsito y registro de actividad de operaciones
          críticas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          11. Vigencia
        </h2>
        <p className="text-sm leading-relaxed">
          La presente política entra en vigencia a partir de su
          publicación. Los datos personales serán tratados durante el
          tiempo necesario para cumplir las finalidades descritas o
          hasta que el titular solicite su supresión cuando legalmente
          sea procedente.
        </p>
      </section>
    </article>
  );
}
