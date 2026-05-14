# Guía de marca de CNV Learning

**Última actualización:** 12 de mayo de 2026

## Identidad

CNV Learning es la cara pública del producto. **Learning Core Platform (LCP)** es el posicionamiento interno: la plataforma extensible que crecerá hacia acreditación, compliance, onboarding clínico, certificación científica, y CPD/CME. El usuario final ve "CNV Learning". El equipo técnico y los stakeholders internos hablan de "LCP".

**Tono visual:** rigor científico, claridad, modernidad, calma. Cerca de Notion o Linear en seriedad. Lejos de apps de fitness o academias digitales genéricas. La plataforma comunica que aquí estudian profesionales de salud.

## Paleta de color

### Marca primaria (acción, énfasis)

| Token | Hex | Uso |
|---|---|---|
| `primary-50` | `#ECFDF5` | Fondos suaves, badges activos |
| `primary-100` | `#D1FAE5` | Backgrounds hover |
| `primary-500` | `#10B981` | Confirmaciones, success |
| `primary-600` | `#059669` | **Color principal**, botones primarios, links |
| `primary-700` | `#047857` | Hover de botones primarios |
| `primary-800` | `#065F46` | Hero sections, énfasis fuerte |
| `primary-900` | `#064E3B` | Solo casos extremos |

En Tailwind se usa el alias `emerald` (es la misma escala).

### Acento (datos, info secundaria)

| Token | Hex | Uso |
|---|---|---|
| `accent-600` | `#2563EB` | Estadísticas secundarias, info |
| `accent-100` | `#DBEAFE` | Badges informativos |

En Tailwind: `blue-600` y `blue-100`.

### Estados

| Token | Hex | Uso |
|---|---|---|
| Warning | `#F59E0B` | Advertencias, plazos próximos (`amber-500`) |
| Error | `#DC2626` | Errores, destructivo (`red-600`) |
| Error background | `#FEE2E2` | Backgrounds de error (`red-50`) |
| Success | `#10B981` | Confirmaciones (`emerald-500`) |

### Neutrales

| Token | Hex | Uso |
|---|---|---|
| Texto principal | `#0F172A` | Texto de UI, headings (`slate-900`) |
| Texto secundario | `#64748B` | Subtítulos, descripciones (`slate-500`) |
| Texto terciario | `#94A3B8` | Labels, captions (`slate-400`) |
| Borde sutil | `#F1F5F9` | Separadores, bordes de cards (`slate-100`) |
| Fondo de sección | `#F8FAFC` | Backgrounds de áreas (`slate-50`) |
| Fondo principal | `#FFFFFF` | Background base |

## Tipografía

### Fuentes

- **Montserrat** para titulares (Google Fonts).
- **Inter** para body text y UI (Google Fonts).
- Fallback: `system-ui, sans-serif`.

Cargadas en `app/layout.tsx`:

```typescript
import { Montserrat, Inter } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

Aplicadas vía variables CSS en Tailwind:

```typescript
// tailwind.config.ts
fontFamily: {
  display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
}
```

Uso: `font-display` para titulares, `font-sans` (default) para body.

### Escala

| Elemento | Tamaño | Peso | Tracking | Familia |
|---|---|---|---|---|
| Hero h1 | `text-5xl` o `text-6xl` | `font-black` (900) | `tracking-tighter` | display |
| Sección h2 | `text-3xl` o `text-4xl` | `font-black` | `tracking-tight` | display |
| Subsección h3 | `text-xl` o `text-2xl` | `font-bold` (700) | normal | display |
| Card heading h4 | `text-lg` | `font-bold` | normal | display |
| Body | `text-base` | `font-normal` (400) | normal | sans |
| Body pequeño | `text-sm` | `font-normal` | normal | sans |
| Label / caption | `text-xs` o `text-[10px]` | `font-black` | `tracking-widest` | sans |
| Botón | `text-sm` | `font-semibold` (600) | `tracking-wide` | sans |

**Regla:** `font-black` (peso 900) se reserva para titulares y labels en uppercase. Nunca en bloques de texto largo, cansa la lectura.

## Sistema de radios

Reemplazo del prototipo (que usa `rounded-[5rem]` y similares, demasiado expresivo para software clínico):

| Token | Tailwind | Pixels | Uso |
|---|---|---|---|
| sm | `rounded-lg` | 8 | Inputs, badges, chips |
| md | `rounded-xl` | 12 | Botones, inputs grandes |
| lg | `rounded-2xl` | 16 | Cards estándar |
| xl | `rounded-3xl` | 24 | Cards destacados |
| 2xl | `rounded-[2rem]` | 32 | Hero sections, modales |
| Max | `rounded-[2.5rem]` | 40 | Solo casos especiales (perfil, certificado) |

**Nunca usar más de 40px de radio.** El prototipo original usa hasta 80px (`rounded-[5rem]`) que se ve "concept art", no software profesional.

## Espaciado

Sistema de 4px base. En Tailwind:

| Token | Tailwind | Pixels | Uso |
|---|---|---|---|
| xs | `1` | 4 | Gaps minúsculos |
| sm | `2` | 8 | Gaps en grupos compactos |
| md | `4` | 16 | Padding interno de cards pequeños |
| lg | `6` | 24 | Padding estándar |
| xl | `8` | 32 | Padding generoso |
| 2xl | `10` o `12` | 40 o 48 | Padding de secciones |
| hero | `16` o `20` | 64 u 80 | Hero sections, headers principales |

## Sombras

| Token | Tailwind | Uso |
|---|---|---|
| sm | `shadow-sm` | Cards en reposo |
| md | `shadow-md` | Elementos elevados sutiles |
| lg | `shadow-lg` | Modales, popovers |
| xl | `shadow-xl` con tinte (`shadow-emerald-100`) | Botones primarios destacados |
| 2xl | `shadow-2xl` | Solo modales y elementos top-level |

## Iconografía

**Única librería:** `lucide-react`.

Tamaños:

| Tamaño | Tailwind | Pixels | Uso |
|---|---|---|---|
| xs | `w-4 h-4` | 16 | Inline en texto, badges |
| sm | `w-5 h-5` | 20 | Navegación, botones |
| md | `w-6 h-6` | 24 | Acciones destacadas |
| lg | `w-8 h-8` | 32 | Tarjetas de feature |
| xl | `w-12 h-12` | 48 | Hero icons |

**Nunca mezclar con otras librerías** (Heroicons, Feather, FontAwesome). Si un ícono no está en lucide, se usa el más cercano o se diseña uno custom como SVG.

## Componentes UI base

Toda la primitiva viene de shadcn/ui. Las que se instalan en MVP:

- `Button`
- `Input`
- `Label`
- `Textarea`
- `Card` (con CardHeader, CardContent, CardFooter)
- `Dialog` (modales)
- `Sheet` (slide-overs)
- `Dropdown Menu`
- `Avatar`
- `Badge`
- `Alert`
- `Toast` (vía `sonner`)
- `Progress` (barra de progreso)
- `Tabs`
- `Select`
- `Form` (con react-hook-form + Zod)
- `Skeleton` (loading states)

Cuando se necesita un componente más complejo, se compone a partir de las primitivas, no se descarga otro.

## Estados de interacción

Toda interacción tiene:

- **Normal:** estado base.
- **Hover:** sutil cambio de fondo o color (`hover:bg-emerald-700` para botones primarios).
- **Active / Pressed:** ligero scale-down (`active:scale-[0.98]`).
- **Focus visible:** anillo de color marca (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
- **Disabled:** `opacity-50 cursor-not-allowed`.
- **Loading:** spinner reemplazando el contenido del botón, NO un spinner separado al lado.

## Tono de voz

### Reglas

- **Tuteo en español neutro.** No "vos", no "usted" en interfaz (sí en política legal).
- **Sin signos de exclamación** salvo bienvenida explícita ("¡Bienvenido, Santiago!").
- **Sin palabras de exageración:** "súper", "increíble", "asombroso", "fenomenal", "espectacular", "amazing".
- **Sin emojis en UI.**
- **Mensajes orientados al usuario:** "Has completado el módulo", no "Module completed".
- **Verbos en presente o pasado perfecto:** "Continúa donde dejaste", "Has entregado tu tarea".

### Tabla de buenos vs malos textos

| Bueno | Malo |
|---|---|
| Continúa donde dejaste | ¡Súper! Sigue avanzando 🚀 |
| Has completado este módulo | ¡Asombroso! Completaste el módulo 🎉 |
| El docente revisó tu entrega | Tu tarea fue calificada increíblemente bien |
| Cargando contenido | Loading... |
| No tienes notificaciones | Inbox empty 📪 |
| Tu sesión expiró, vuelve a iniciar | Oops! Algo salió mal |
| Esta acción no se puede deshacer | ⚠️ ¡Cuidado! Esto es irreversible |

### Sin em dashes

**Regla dura del proyecto:** ningún em dash (—) en textos de UI, copy, documentación, ni código. Se reemplaza por:

- Coma cuando es pausa breve.
- Punto cuando es separación de ideas.
- Paréntesis cuando es aclaración.
- Punto y coma cuando es enumeración compleja.

## Identidad de marca visual

### Logo

En MVP usamos un placeholder textual: `CNVLearning` en `font-display` peso 900, color `emerald-700`, con `Learning` en `slate-800`. Cuando llegue el logo oficial del director (SVG), se reemplaza el archivo en `public/brand/logo.svg`.

### Favicon

Placeholder: `C` en círculo emerald-600 sobre fondo blanco. Reemplazable.

### Sello para certificado

Placeholder en `public/certificates/templates/v1/seal.png`. Imagen 200x200 px con sello CNV. Reemplazable.

### Patrones visuales

- **Cards con sombra sutil y bordes redondeados.**
- **Backgrounds blancos o `slate-50` para diferenciación de áreas.**
- **Hero sections en `emerald-800` con texto blanco para énfasis.**
- **Tablas con borde superior emerald y filas alternadas en `slate-50`.**

## Layout

### Sidebar de navegación

- Ancho fijo en desktop: `w-72` o `w-80` (288 o 320px). El prototipo usa `w-[380px]` que es excesivo; recomendado bajar a `w-72`.
- Background blanco con borde derecho `slate-100`.
- Padding interno `p-6` u `p-8`.
- Items con `rounded-xl` o `rounded-2xl`, NO `rounded-[2rem]`.

### Header

- Altura `h-16` o `h-20`.
- Background blanco con border-bottom sutil.
- Avatar a la derecha con dropdown para logout.

### Páginas

- Max-width del contenido principal: `max-w-7xl` (1280px) centrado.
- Padding lateral: `px-6` en móvil, `px-10` en desktop.
- Padding vertical: `py-10` o `py-12`.

## Responsive

Breakpoints estándar de Tailwind:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

En MVP el target principal es desktop (los profesionales en formación van a estudiar en computador), pero **todo debe ser usable en móvil**. Mínimo:

- Sidebar colapsa a menú hamburguesa en `<lg`.
- Cards y formularios se apilan en una columna en `<md`.
- Videos de YouTube responsive con aspect-video.
- Tablas con scroll horizontal en móvil cuando son anchas.

## Accesibilidad

Mínimos no negociables:

- Contraste de color WCAG AA en textos sobre fondos (verificado en herramientas como Coolors o WebAIM).
- Focus visible en todos los elementos interactivos.
- Alt text obligatorio en imágenes informativas (vacío `alt=""` en decorativas).
- Labels visibles o asociados (no solo placeholder).
- `aria-label` en botones que solo tienen ícono.
- Skip link al contenido principal (en v1.1).

## Animaciones

Sutiles, breves:

- `transition-all duration-200` para cambios de color y estado.
- `animate-pulse` para loading.
- Fade-in 300ms al cambiar de página.
- Sin animaciones largas, sin parallax, sin scroll-triggered.

## Imágenes

- Avatars: cuadrados con `rounded-full`.
- Fotos de curso: ratio 16:9 o 3:2, `rounded-xl`.
- Sin imágenes stock genéricas. Si no hay imagen real, placeholder con iniciales o ícono.

## Lo que NO se debe hacer

- Mezclar fuentes (solo Montserrat + Inter).
- Usar más de 2-3 colores fuera de la escala definida.
- Usar `rounded-[3rem]` o más grande en componentes regulares.
- Emojis en mensajes de UI.
- Signos de exclamación múltiples.
- Texto en mayúsculas de más de 20 caracteres.
- Sombras de neón o gradientes llamativos.
- Imágenes de stock con personas sonriendo genéricas.
- Iconos sin estilo coherente (mezcla de líneas y rellenos).
