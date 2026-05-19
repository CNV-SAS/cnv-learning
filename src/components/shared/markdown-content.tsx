// MarkdownContent: render seguro de markdown user-generated.
// Compartido entre dominios (forum threads/replies, announcements,
// y futuras features que muestren contenido enriquecido). Server
// Component (react-markdown no usa hooks; render puro).
//
// SECURITY.md 403: sin allowDangerousHtml, sin rehype-raw. No se
// permite HTML inline. react-markdown renderiza a React elements
// (no a HTML string), asi que DOMPurify no es necesario aqui (la
// sanitization la hace el modelo de renderizado: cualquier tag
// HTML escrito por el user se trata como texto literal).
//
// Style map: alineado con lesson-content.tsx para consistencia
// visual del proyecto. h1 del markdown se degrada a h2 (estilo
// visual) porque la pagina contenedora suele tener el h1 propio.
//
// Historico: nacio como PostBody en modules/forum/components (Bloque
// 9.4) y se extrajo al cierre del Bloque 10 cuando announcements
// pidio el mismo render, para evitar duplicar el style map.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  body: string;
}

export function MarkdownContent({ body }: MarkdownContentProps) {
  return (
    <div className="space-y-3 text-base leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-lg font-semibold">{children}</h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => (
            <ul className="list-inside list-disc space-y-1 pl-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-inside list-decimal space-y-1 pl-2">
              {children}
            </ol>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, ...props }) => (
            <code
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-sm">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-200 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-emerald-700 underline hover:text-emerald-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
