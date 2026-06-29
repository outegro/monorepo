import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders markdown from lesson material and LLM answers (ask-AI, homework feedback).
 * Styled inline (no @tailwindcss/typography dependency) so headings, lists, code and
 * bold all format correctly instead of showing raw `**` / `#` characters.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-[0.95rem] text-foreground/90 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h3 className="mt-2 font-semibold text-lg" {...strip(p)} />,
          h2: (p) => <h3 className="mt-2 font-semibold text-base" {...strip(p)} />,
          h3: (p) => <h4 className="mt-1 font-semibold text-base" {...strip(p)} />,
          p: (p) => <p className="leading-relaxed" {...strip(p)} />,
          ul: (p) => <ul className="ml-5 flex list-disc flex-col gap-1" {...strip(p)} />,
          ol: (p) => <ol className="ml-5 flex list-decimal flex-col gap-1" {...strip(p)} />,
          li: (p) => <li className="pl-1" {...strip(p)} />,
          strong: (p) => <strong className="font-semibold" {...strip(p)} />,
          em: (p) => <em className="italic" {...strip(p)} />,
          a: (p) => (
            <a
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...strip(p)}
            />
          ),
          code: (p) => (
            <code
              className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.85em]"
              {...strip(p)}
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="border-border border-l-2 pl-3 text-muted-foreground"
              {...strip(p)}
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** react-markdown injects a `node` prop that isn't a valid DOM attribute — drop it. */
function strip<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const { node: _node, ...rest } = props;
  return rest;
}

export type MarkdownElementProps = ComponentPropsWithoutRef<"div">;
