import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { JobZoneBadge, zoneShort } from "@/components/career-bits";
import { Container } from "@/components/layout";
import { Button, buttonClass, linkClass } from "@/components/ui/button";
import { FilterMenu } from "@/components/ui/controls";
import { useData } from "@/lib/data";
import type { Occupation } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const PAGE = 20;

function pageList(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, 2, 3, current - 1, current, current + 1, count]);
  const sorted = [...pages].filter(p => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

function Pagination({ page, count, onPage }: { page: number; count: number; onPage: (p: number) => void }) {
  return (
    <nav aria-label="Pages" className="flex items-center gap-0.5">
      <Button variant="ghost" className="size-8 px-0" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      {pageList(page, count).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "secondary" : "ghost"}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPage(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button variant="ghost" className="size-8 px-0" disabled={page === count} onClick={() => onPage(page + 1)} aria-label="Next page">
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}

export default function ExplorePage() {
  const data = useData();
  const params = new URLSearchParams(useSearch());
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [field, setField] = useState(params.get("field") ?? "all");
  const [zone, setZone] = useState("any");
  const [tool, setTool] = useState("any");
  const [page, setPage] = useState(1);
  const [mobileShown, setMobileShown] = useState(PAGE);
  const [allFields, setAllFields] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(() => matchMedia("(max-width: 639px)").matches);

  useEffect(() => {
    const mq = matchMedia("(max-width: 639px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const fieldName = (code: string) => data.fields[code] ?? "Other";
  const fieldCodes = Object.keys(data.fields);
  const toolOptions = useMemo(
    () => [
      { value: "any", label: "Any" },
      ...data.tools.slice(0, 40).map(t => ({ value: String(t.id), label: t.name })),
    ],
    [data.tools],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const toolHits =
      q.length >= 2
        ? new Set(data.tools.filter(t => t.name.toLowerCase().includes(q) || t.full.toLowerCase().includes(q)).map(t => t.id))
        : new Set<number>();
    const toolId = tool === "any" ? null : Number(tool);
    return data.occupations
      .filter(o => {
        if (field !== "all" && o.field !== field) return false;
        if (zone !== "any" && (zone === "none" ? o.zone !== null : String(o.zone) !== zone)) return false;
        if (toolId !== null && !o.inDemand.includes(toolId) && !o.hot.includes(toolId)) return false;
        if (!q) return true;
        return o.title.toLowerCase().includes(q) || [...o.inDemand, ...o.hot].some(id => toolHits.has(id));
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [data, query, field, zone, tool]);

  useEffect(() => {
    setPage(1);
    setMobileShown(PAGE);
  }, [query, field, zone, tool]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  // In-demand tools first; fall back to hot technologies when a career lists none
  const topTools = (o: Occupation) => {
    const ids = o.inDemand.length ? o.inDemand : o.hot;
    if (!ids.length) return "No software listed";
    return ids
      .map(id => data.tools[id])
      .sort((a, b) => b.careers - a.careers)
      .slice(0, 3)
      .map(t => t.name)
      .join(" · ");
  };

  function pickField(code: string) {
    setField(code);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Container className="flex flex-col gap-10 pb-16 pt-8 md:gap-12 md:pb-24 md:pt-16">
      <div className="flex flex-col gap-2.5">
        <h1 className="text-display-3">Explore {formatNumber(data.occupations.length)} careers</h1>
        <p className="max-w-[640px] text-lg leading-[26px] text-muted-foreground max-sm:text-base max-sm:leading-[22px]">
          Search by job title or by a tool you know.<span className="max-sm:hidden"> Build a profile any time to see how you match.</span>
        </p>
      </div>

      <div className="flex h-12 items-center gap-2.5 rounded-element border border-border bg-card px-4 focus-within:border-primary">
        <Search className="size-[18px] shrink-0 text-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search careers by title or tool"
          placeholder={narrow ? "Title or tool" : 'Search titles or tools, e.g. "nurse" or "AutoCAD"'}
          className="h-full min-w-0 flex-1 bg-transparent placeholder:text-subtle focus:outline-none"
        />
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="fields-h">
        <div className="flex items-center justify-between">
          <h2 id="fields-h" className="text-h2 font-semibold">
            Browse by field
          </h2>
          <p className="text-sm text-muted-foreground max-sm:hidden">{fieldCodes.length} fields</p>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {fieldCodes.map((code, i) => (
            <li key={code} className={cn("border-b border-border py-1", !allFields && i >= 5 && "max-sm:hidden")}>
              {/* Inset pill: the hover fill sits between the dividers and extends past the text on both sides */}
              <button
                type="button"
                onClick={() => pickField(code)}
                className={cn(
                  "group -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-4 rounded-element px-3 py-2 text-left transition-colors duration-150 hover:bg-neutral",
                  field === code && "bg-neutral",
                )}
                aria-pressed={field === code}
              >
                <span className={cn("font-medium", field === code && "font-semibold")}>{fieldName(code)}</span>
                {/* At rest the count sits flush right; on hover it slides aside for the arrow */}
                <span className="relative flex items-center text-muted-foreground transition-colors group-hover:text-foreground">
                  <span className="transition-transform duration-150 group-hover:-translate-x-5 group-focus-visible:-translate-x-5">
                    {data.fieldCounts[code]}
                  </span>
                  <ChevronRight
                    className="absolute -right-1 size-4 -translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!allFields && (
          <button type="button" className={cn(linkClass, "self-start sm:hidden")} onClick={() => setAllFields(true)}>
            Show all {fieldCodes.length} fields
          </button>
        )}
      </section>

      <section ref={listRef} className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="all-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="all-h" className="text-h2 font-semibold">
            All careers
          </h2>
          <div className="flex flex-wrap gap-2">
            <FilterMenu
              label="Field"
              value={field}
              options={[{ value: "all", label: "All" }, ...fieldCodes.map(c => ({ value: c, label: fieldName(c) }))]}
              onChange={setField}
            />
            <FilterMenu
              label="Job Zone"
              value={zone}
              options={[
                { value: "any", label: "Any" },
                { value: "2", label: "Zone 2" },
                { value: "3", label: "Zone 3" },
                { value: "4", label: "Zone 4" },
                { value: "5", label: "Zone 5" },
                { value: "none", label: "Not rated" },
              ]}
              onChange={setZone}
            />
            <FilterMenu label="Uses tool" value={tool} options={toolOptions} onChange={setTool} />
          </div>
        </div>

        <p className="sr-only" role="status">
          {filtered.length} careers found
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-card border border-border bg-card p-6">
            <p className="font-medium">No careers match.</p>
            <p className="text-muted-foreground">Try a shorter search or clear a filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-hidden rounded-card border border-border bg-card max-md:hidden">
              <table className="w-full table-fixed text-left">
                <thead className="text-sm text-muted-foreground">
                  <tr>
                    <th className="w-[32%] px-6 py-4 font-normal">Career</th>
                    <th className="w-[22%] py-4 pr-6 font-normal">Field</th>
                    <th className="w-[24%] py-4 pr-6 font-normal">Preparation</th>
                    <th className="py-4 pr-6 font-normal">Top tools</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(o => (
                    <tr key={o.code} className="relative border-t border-border transition-colors duration-150 hover:bg-neutral/60">
                      <td className="px-6 py-4 font-semibold">
                        <Link href={`/career/${o.code}`} className="after:absolute after:inset-0 hover:underline">
                          {o.title}
                        </Link>
                      </td>
                      <td className="py-4 pr-6 text-muted-foreground">{fieldName(o.field)}</td>
                      <td className="py-4 pr-6">
                        <JobZoneBadge zone={o.zone} />
                      </td>
                      <td className="py-4 pr-6 text-muted-foreground">{topTools(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between max-md:hidden">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE + 1} to {Math.min(page * PAGE, filtered.length)} of {formatNumber(filtered.length)}
              </p>
              {pageCount > 1 && (
                <Pagination
                  page={page}
                  count={pageCount}
                  onPage={p => {
                    setPage(p);
                    listRef.current?.scrollIntoView({ block: "start" });
                  }}
                />
              )}
            </div>

            {/* Mobile list */}
            <div className="md:hidden">
              <div className="flex items-center justify-end pb-2">
                <p className="text-sm text-muted-foreground">A to Z</p>
              </div>
              <ul className="flex flex-col border-t border-border">
                {filtered.slice(0, mobileShown).map(o => (
                  <li key={o.code} className="border-b border-border">
                    <Link href={`/career/${o.code}`} className="flex flex-col gap-1 py-4">
                      <span className="font-semibold">{o.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {fieldName(o.field)} · {zoneShort(o.zone)}
                      </span>
                      <span className="text-sm">{topTools(o)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {mobileShown < filtered.length && (
                <button type="button" className={buttonClass("secondary", "lg", "mt-4 w-full")} onClick={() => setMobileShown(s => s + PAGE)}>
                  Load 20 more
                </button>
              )}
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Showing {Math.min(mobileShown, filtered.length)} of {formatNumber(filtered.length)}
              </p>
            </div>
          </>
        )}
      </section>
    </Container>
  );
}
