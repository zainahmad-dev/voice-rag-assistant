import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent-hover"
    >
      {children}
    </a>
  ),
  code: ({ children, ...props }) => (
    <code
      className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="scrollbar-thin mb-2 overflow-x-auto rounded-lg border border-border bg-surface-raised p-3 font-mono text-[0.85em] leading-relaxed last:mb-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-foreground">
      {children}
    </pre>
  ),
};

interface MarkdownContentProps {
  content: string;
}

/**
 * Renders assistant replies (paragraphs, lists, bold/italic, code blocks) as
 * real markdown instead of raw text, styled with the app's existing design
 * tokens rather than react-markdown's defaults.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="text-[15px] text-foreground">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
