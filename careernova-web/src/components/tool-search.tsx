import { Command } from "cmdk";
import { useMemo, useRef, useState } from "react";
import type { Tool } from "@/lib/types";

/**
 * Multi-select tool search (cmdk). Up/Down move, Enter adds, Esc closes,
 * Backspace on an empty input removes the last added tool.
 */
export function ToolSearch({
  tools,
  selected,
  onAdd,
  onRemoveLast,
}: {
  tools: Tool[];
  selected: Set<string>;
  onAdd: (tool: Tool) => void;
  onRemoveLast: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tools
      .filter(t => !selected.has(t.full))
      .map(t => {
        const name = t.name.toLowerCase();
        const full = t.full.toLowerCase();
        const rank = name === q ? 0 : name.startsWith(q) ? 1 : full.includes(q) || name.includes(q) || t.aliases.includes(q) ? 2 : -1;
        return { t, rank };
      })
      .filter(x => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank || b.t.careers - a.t.careers)
      .slice(0, 8)
      .map(x => x.t);
  }, [query, tools, selected]);

  const showList = open && query.trim().length > 0;

  return (
    <Command shouldFilter={false} loop className="flex flex-col gap-1.5" label="Search tools">
      {/* cmdk links its own hidden label ("Search tools") to the input */}
      <span aria-hidden className="font-medium text-muted-foreground">
        Search tools
      </span>
      <Command.Input
        ref={inputRef}
        value={query}
        onValueChange={v => {
          setQuery(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Backspace" && query === "") onRemoveLast();
        }}
        placeholder="e.g. Python, Excel, AutoCAD"
        className="h-9 w-full rounded-element border border-border bg-card px-2.5 text-base placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-neutral"
      />
      {showList && (
        <Command.List className="rounded-element border border-border bg-card p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-muted-foreground">No tool matches "{query}". Try a shorter name.</p>
          ) : (
            results.map(t => (
              <Command.Item
                key={t.id}
                value={String(t.id)}
                onMouseDown={e => e.preventDefault()}
                onSelect={() => {
                  onAdd(t);
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-inner px-3 py-2.5 data-[selected=true]:bg-background"
              >
                <span className="font-medium">{t.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {t.kind === "in-demand" ? "In-demand" : "Hot technology"} · {t.careers} careers
                </span>
              </Command.Item>
            ))
          )}
          <p className="px-3 py-2 text-sm text-subtle max-sm:hidden">Up/Down to move · Enter to add · Esc to close</p>
        </Command.List>
      )}
    </Command>
  );
}
