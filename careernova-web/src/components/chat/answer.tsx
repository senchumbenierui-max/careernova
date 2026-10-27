import type { ReactNode } from "react";
import { Link } from "wouter";
import type { Occupation } from "@/lib/types";

const LIST_ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+/;
const INLINE = /(\*\*[^*\n]+\*\*|\[\d{2}-\d{4}\.\d{2}\])/;

/** Bold text, and occupation codes in brackets as links to their career pages */
function inline(text: string, byCode: Map<string, Occupation>): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const code = part.match(/^\[(.+)\]$/)?.[1];
    const o = code ? byCode.get(code) : undefined;
    // A code the model made up stays plain text, so it never links to a career that doesn't exist
    if (!o) return part;
    return (
      <Link
        key={i}
        href={`/career/${o.code}`}
        title={`Open ${o.title}`}
        aria-label={`Open ${o.title}`}
        className="mx-0.5 inline-block rounded-inner bg-neutral px-1.5 align-baseline font-mono text-sm text-foreground hover:bg-neutral-hover"
      >
        {o.code}
      </Link>
    );
  });
}

/** Renders the small subset of Markdown the assistant is asked to write: paragraphs, lists and bold. */
export function Answer({ text, byCode }: { text: string; byCode: Map<string, Occupation> }) {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (paragraph.length) {
      blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "), byCode)}</p>);
      paragraph = [];
    }
    if (list) {
      const items = list.items.map((item, i) => <li key={i}>{inline(item, byCode)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={blocks.length} className="list-decimal pl-5">{items}</ol>
        ) : (
          <ul key={blocks.length} className="list-disc pl-5">{items}</ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/^#+\s+/, "").trim();
    const item = raw.match(LIST_ITEM);
    if (!line) {
      flush();
    } else if (item) {
      if (paragraph.length) flush();
      const ordered = item[1] !== undefined;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push(raw.slice(item[0].length).trim());
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return <div className="flex flex-col gap-2 break-words">{blocks}</div>;
}
