import { useState } from "react";
import type { SkillRow } from "@/lib/match";
import { cn } from "@/lib/utils";

const W = 280;
const PAD = 7;
const x = (v: number) => PAD + ((v - 1) / 4) * (W - PAD * 2);

/** Dumbbell row: track, a line between you and needed, filled dot = you, ring = needed. */
function Scale({ row }: { row: SkillRow }) {
  const color = row.meets ? "var(--meets)" : "var(--below)";
  return (
    <svg viewBox={`0 0 ${W} 20`} className="h-5 w-full max-w-[280px]" aria-hidden preserveAspectRatio="none">
      <line x1={PAD} x2={W - PAD} y1={10} y2={10} stroke="var(--track)" strokeWidth={2} />
      {row.you !== row.needed && <line x1={x(row.you)} x2={x(row.needed)} y1={10} y2={10} stroke={color} strokeWidth={2} />}
      <circle cx={x(row.needed)} cy={10} r={5.5} fill="var(--card)" stroke="var(--score)" strokeWidth={2} />
      <circle cx={x(row.you)} cy={10} r={5} fill="var(--foreground)" />
    </svg>
  );
}

function Status({ row }: { row: SkillRow }) {
  return (
    <span className={cn("font-semibold", row.meets ? "text-meets" : "text-below")}>
      {row.meets ? "Meets" : `${row.needed - row.you} below`}
    </span>
  );
}

export function SkillsChart({ rows }: { rows: SkillRow[] }) {
  const [asTable, setAsTable] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
        {!asTable && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground" aria-hidden />
              You
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-2 border-score bg-card" aria-hidden />
              Needed
            </span>
          </>
        )}
        <button type="button" className="text-base text-primary underline-offset-4 hover:underline" onClick={() => setAsTable(t => !t)}>
          {asTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-left">
          <thead className="text-sm text-muted-foreground">
            <tr>
              <th className="py-2 font-normal">Skill</th>
              <th className="py-2 font-normal">You</th>
              <th className="py-2 font-normal">Needed</th>
              <th className="py-2 text-right font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} className="border-t border-border">
                <td className="py-3 font-medium">{r.name}</td>
                <td className="py-3">{r.you}</td>
                <td className="py-3">{r.needed}</td>
                <td className="py-3 text-right">
                  <Status row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="flex flex-col" aria-label="Core skills, you compared with needed">
          {rows.map((r, i) => (
            <li
              key={r.name}
              onMouseEnter={() => setActive(r.name)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(a => (a === r.name ? null : r.name))}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[180px_minmax(0,280px)_100px_1fr] sm:gap-5",
                i > 0 && "border-t border-border",
                active && active !== r.name && "opacity-50",
              )}
            >
              <span className="font-medium max-sm:text-sm">{r.name}</span>
              <Scale row={r} />
              <span className="text-sm text-muted-foreground max-sm:hidden">
                You {r.you} · needs {r.needed}
              </span>
              <span className="text-right max-sm:text-sm">
                <Status row={r} />
                <span className="sr-only">
                  {" "}
                  (you {r.you}, needs {r.needed})
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
