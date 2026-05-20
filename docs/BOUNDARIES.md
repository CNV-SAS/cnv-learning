# Boundaries entre dominios de CNV

**Última actualización:** 12 de mayo de 2026

> Este documento define los límites entre los productos y dominios de Connected Nutrition Ventures. Las reglas de este documento son tan fuertes como las 10 reglas duras de `ARCHITECTURE.md`. Violarlas significa contaminar dominios, lo que destruye independencia, ownership y mantenibilidad.

## Los cuatro dominios

CNV opera (o operará) cuatro productos/dominios técnicamente distintos:

### 1. CNV Learning (LMS / Learning Core Platform)

**Propósito:** educación, formación, evaluación, certificación.

**Vive aquí:**
- Cursos, módulos, lecciones.
- Inscripciones, matrículas, cohortes.
- Progreso académico de estudiantes.
- Tareas, quizzes, ensayos.
- Calificaciones y feedback educativo.
- SpeedGrader IA (sugerencias pedagógicas).
- Foros del curso.
- Certificados educativos.
- Insignias de progreso.
- Comunidad académica.
- Compliance educativa (futuro).
- Acreditación de programas (futuro).
- Onboarding de profesionales en formación (futuro).
- CPD/CME (futuro).

**No vive aquí:**
- Pacientes.
- Mediciones de bioimpedancia.
- Protocolos clínicos en ejecución.
- Decisiones diagnósticas.
- Historias clínicas.
- Recetas o intervenciones nutricionales.
- Operación comercial de comodatos de equipos.
- Inventario de VITACELLEBIS.
- Gestión administrativa de integrantes CNV.

### 2. ATLAS

**Propósito:** sistema clínico, operativo y comercial del modelo de atención en salud ANI-BIS-E.

**Vive aquí:**
- Pacientes y sus mediciones.
- Motor de cálculo del modelo ANI-BIS-E (IFC, IRC, PABU, IEHH, ISCM, etc.).
- Protocolos clínicos.
- Historia clínica del modelo.
- Decisiones clínicas y rutas de atención.
- Gestión de comodatos de equipos BiodyXpert ZM3.
- Inventario y envíos de VITACELLEBIS.
- Operación comercial: integrantes CNV, consignaciones, pagos.
- Gestión administrativa del modelo de atención.

**No vive aquí:**
- Cursos, lecciones, tareas educativas.
- Foros educativos.
- Certificados de aprendizaje.
- Calificaciones académicas.

### 3. CNV Core (compartido)

**Propósito:** identidad y servicios transversales entre productos.

**Vive aquí (en el futuro):**
- Identidad unificada de personas (SSO entre LCP y ATLAS).
- Audit trail cross-plataforma.
- Sistema de eventos cross-producto.
- Catálogo de profesionales acreditados.
- Compliance global de la organización.

**Estado en MVP:** no existe como código separado. Cada producto maneja su propia identidad. Cuando se integren LCP y ATLAS, se extrae CNV Core como capa común.

### 4. CNV Research / Observatorio (OB BIA LATAM)

**Propósito:** análisis científico, agregación de datos anonimizados.

**Vive aquí:**
- Datos agregados anonimizados de ATLAS (mediciones de bioimpedancia).
- Análisis estadístico de la cohorte clínica.
- Publicaciones científicas.
- Datasets para investigación.

**Estado en MVP:** dominio totalmente independiente, fuera del alcance del LMS. Es trabajo del equipo de investigación.

## Reglas duras de boundary

### Regla B1: cero imports cruzados entre productos

**Prohibido:**

```typescript
// EN CÓDIGO DE CNV LEARNING
import { calculateProtocol } from '@/atlas/services/protocol-engine';
import { Patient } from '@/atlas/types/patient';
```

**Prohibido:**

```typescript
// EN CÓDIGO DE ATLAS
import { Certificate } from '@/cnv-learning/modules/certificates/types';
import { issueCompletionCertificate } from '@/cnv-learning/modules/certificates/services';
```

Aunque CNV Learning y ATLAS algún día vivan en el mismo monorepo, **nunca se importan entre sí directamente**. La integración va por mecanismos definidos abajo.

### Regla B2: cero compartición de tablas

ATLAS tiene su propia base de datos (su propio proyecto Supabase). CNV Learning tiene la suya. **No hay queries cross-database directas.**

Si CNV Learning necesita saber algo de ATLAS (por ejemplo, si un alumno tiene un perfil profesional verificado en ATLAS), va a un endpoint público de ATLAS, no a su base de datos.

### Regla B3: cero side effects cruzados sin contrato explícito

Cuando un evento en un producto necesita disparar algo en otro:

**Prohibido:**

```typescript
// EN CNV LEARNING, dentro del service de certificates
await atlasClient.notifyCertificateIssued(...);
```

**Permitido:**

```typescript
// EN CNV LEARNING
events.emit('certificate.issued', payload);

// EN CNV CORE (en el futuro, código separado y desplegado independientemente)
events.on('certificate.issued', async (payload) => {
  await atlasApi.notifyCredential(payload);
});
```

El productor no conoce al consumidor. Ese desacoplamiento es la regla.

### Regla B4: contratos compartidos viven en CNV Core

Cuando dos productos comparten un concepto (por ejemplo, identidad de persona), el tipo se define UNA vez en CNV Core y ambos productos lo consumen. Si CNV Core aún no existe como paquete, se duplica el tipo conscientemente en cada producto con comentario indicando que es contrato compartido. Cuando se extraiga CNV Core, se elimina la duplicación.

### Regla B5: ATLAS no aparece en el LMS del Diplomado (MVP)

**Decisión revisada en Bloque 17 (2026-05-20):** el LMS del Diplomado en Medicina Bioeléctrica y el sistema ATLAS son productos independientes con audiencias distintas. ATLAS no se incluye en el sidebar ni en el footer del LMS para MVP y v1.1.

Cuando se integren más profundamente (v2+), se hace mediante:

- **SSO compartido**: ambos productos delegan auth a CNV Core, comparten identidad de usuario.
- **Webhooks o eventos**: ATLAS notifica a Learning cuando un profesional verifica su licencia, Learning notifica a ATLAS cuando un profesional completa un curso de certificación.
- **API pública limitada**: cada producto expone endpoints específicos al otro, con autenticación inter-servicio.

Pero nada de esto vive en MVP, ni siquiera como link de navegación cross-producto.

## Mecanismos de integración inter-producto

Cuando llegue el momento (v2+), las opciones son, en orden de preferencia:

### Opción A: Eventos vía bus compartido

Productor emite, consumidor escucha. Asíncrono, desacoplado, durable (con Inngest o similar).

**Ejemplo:** Learning emite `course.completed`. CNV Core lo escucha y actualiza el catálogo de profesionales acreditados. ATLAS también lo escucha y otorga un badge en el perfil clínico.

### Opción B: API REST con contratos OpenAPI

Cada producto expone una API documentada con OpenAPI. El consumidor llama vía cliente generado.

**Ejemplo:** Learning expone `GET /api/v1/users/:id/certificates`. ATLAS llama a este endpoint para mostrar los certificados del profesional dentro de su perfil clínico.

### Opción C: Webhooks

Cuando algo cambia, productor llama un webhook del consumidor.

**Ejemplo:** Learning notifica a ATLAS cuando se emite un certificado, mediante un webhook configurado en el panel admin.

### Mecanismos NO permitidos

- Importar código entre productos.
- Compartir base de datos.
- Compartir conexión de Supabase.
- Compartir variables de entorno entre productos (excepto las propias de CNV Core).

## Casos concretos del MVP

### Caso 1: "Quiero ver mis cursos desde ATLAS"

**Solución MVP:** no se hace. ATLAS no sabe nada de cursos.

**Solución v2:** ATLAS tiene una sección "Mi formación" que llama `GET https://lms.cnvsystem.com/api/v1/users/me/courses` (con SSO compartido autenticando al usuario). Muestra la lista en la UI de ATLAS.

### Caso 2: "Cuando un alumno completa un curso, su credencial debe aparecer en el directorio público de profesionales"

**Solución MVP:** no aplica, no hay directorio público.

**Solución v2:** Learning emite `course.completed`. CNV Core escucha y actualiza la entidad `professional_credentials` del directorio.

### Caso 3: "El docente del curso quiere ver datos de bioimpedancia de los alumnos para validar el aprendizaje"

**Solución:** **No.** Esto contamina dominios. ATLAS tiene datos clínicos de pacientes, no de alumnos. Un alumno puede ser un profesional que use ATLAS para atender a pacientes, pero sus alumnos no son sus pacientes.

Si el docente quiere mostrar mediciones reales como ejercicio, sube screenshots o datos exportados manualmente al material del curso. Los datos clínicos reales nunca cruzan al LMS.

### Caso 4: "Quiero que la sugerencia IA del SpeedGrader use conocimiento clínico de ANI-BIS-E"

**Solución correcta:** el prompt de SpeedGrader incluye conocimiento educativo de ANI-BIS-E como contexto (criterios de evaluación, fórmulas correctas, errores comunes). Pero ese conocimiento vive **dentro del módulo `assignments/ai/prompts/`** de Learning, no se importa desde ATLAS. Si ATLAS implementa el motor de cálculo, Learning tiene su propia versión simplificada para fines educativos. Es duplicación consciente justificada por boundary.

## Cuándo extraer CNV Core

CNV Core como código separado y desplegado se justifica cuando:

1. Hay al menos dos productos en producción (Learning y ATLAS).
2. Hay al menos tres entidades compartidas reales (no especuladas).
3. Hay un equipo dedicado o un responsable claro.

Hasta entonces, "CNV Core" es un nombre conceptual. Cada producto duplica lo poco que necesita compartir, con comentario indicando que es contrato.

## Convención de comentarios para boundaries

Cualquier código que toque la línea entre productos lleva comentario explícito:

```typescript
// BOUNDARY: este tipo es contrato compartido con ATLAS.
// Si cambia, coordinar con el responsable de ATLAS antes de mergear.
// Eventualmente este tipo migra a @cnv/core.
export type ProfessionalIdentity = {
  id: string;
  fullName: string;
  professionalLicense: string;
  verifiedAt: string | null;
};
```

## Validación de boundaries

En el repositorio, una regla de ESLint personalizada (cuando llegue v1.1) verifica que no haya imports cruzados:

```javascript
// .eslintrc
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        "@/atlas/*",
        "@atlas/*",
        "**/atlas/**"
      ]
    }]
  }
}
```

En MVP, la validación es disciplina humana documentada en este archivo. Cada PR debe verificarse contra estas reglas en el self-review.
