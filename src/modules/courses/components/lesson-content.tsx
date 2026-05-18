// LessonContent: renderiza markdown del campo lessons.content_markdown.
// Server Component (react-markdown no requiere "use client" porque
// no usa hooks; el render es puro).
//
// Sin @tailwindcss/typography (no es dependencia del proyecto): el
// styling se aplica con un components map custom para los elementos
// que usa el MVP (h1-h3, p, ul/ol, strong/em, code, pre, blockquote,
// a). Si en bloques posteriores el contenido se enriquece (tablas,
// task lists, etc.) y este map se vuelve voluminoso, considerar
// agregar @tailwindcss/typography con `prose` y eliminar el map.
//
// Sin DOMPurify (decision Bloque 4 ambiguedad 3): el contenido viene
// del admin via seed/BD, no de input de usuario. Defensa en
// profundidad si Santiago la solicita en Bloque 17/18.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface LessonContentProps {
  content: string;
}

export function LessonContent({ content }: LessonContentProps) {
  return (
    <div className="space-y-4 text-base leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 font-display text-2xl font-black tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 font-display text-xl font-bold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-lg font-semibold">{children}</h3>
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
