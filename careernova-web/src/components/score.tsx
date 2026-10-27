import { useEffect, useState } from "react";
import type { ScorePart } from "@/lib/match";
import { cn } from "@/lib/utils";
import { Tip } from "./ui/controls";

function useCountUp(target: number) {
  const reduce = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 400);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduce]);
  return value;
}

/** Large: 64px number with "/ 100" and "match score". */
export function FitScore({ score, animate = true }: { score: number; animate?: boolean }) {
  const shown = useCountUp(score);
  return (
    <div className="flex flex-col gap-2">
      <span className="sr-only">Match score {score} out of 100</span>
      <Tip content="Match score: how much your profile overlaps this career, out of 100.">
        <div className="flex w-fit items-baseline gap-1" aria-hidden>
          <span className="text-[64px] leading-[64px] tabular-nums">{animate ? shown : score}</span>
          <span className="text-muted-foreground">/ 100</span>
        </div>
      </Tip>
      <p className="text-sm text-muted-foreground" aria-hidden>
        match score
      </p>
    </div>
  );
}

/** Compact: "68 match" as used on occupation cards. */
export function FitScoreInline({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="sr-only">Match score {score} out of 100</span>
      <span className="text-h2 font-semibold tabular-nums" aria-hidden>
        {score}
      </span>
      <span className="text-sm text-muted-foreground" aria-hidden>
        match
      </span>
    </span>
  );
}

export function ScoreBar({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-[3px] bg-track", className)} aria-hidden>
      <div className="h-full rounded-[3px] bg-score" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

export function ScorePartRow({ part, showReason = true }: { part: ScorePart; showReason?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{part.label}</span>
        <span className="font-semibold tabular-nums">
          {part.points} / {part.max}
        </span>
      </div>
      <ScoreBar value={part.points} max={part.max} />
      {showReason && <p className="text-muted-foreground">{part.reason}</p>}
    </div>
  );
}

export function ScoreBreakdown({ parts, showReason = true, className }: { parts: ScorePart[]; showReason?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", !showReason && "gap-4", className)}>
      {parts.map(p => (
        <ScorePartRow key={p.key} part={p} showReason={showReason} />
      ))}
    </div>
  );
}
