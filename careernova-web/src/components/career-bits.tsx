import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { ZONE_LABELS } from "@/lib/constants";
import type { Match, PlanStep } from "@/lib/match";
import type { Occupation, Zone } from "@/lib/types";
import { cn, courseLinks } from "@/lib/utils";
import { FitScoreInline } from "./score";
import { Badge } from "./ui/badge";
import { linkClass } from "./ui/button";
import { InfoPopover } from "./ui/controls";

export function JobZoneBadge({ zone }: { zone: Zone | null }) {
  return <Badge>{zone ? `Zone ${zone} · ${ZONE_LABELS[zone]}` : "Job Zone not rated"}</Badge>;
}

export function zoneShort(zone: Zone | null) {
  return zone ? `Zone ${zone}` : "Job Zone not rated";
}

/** O*NET's official zone next to the model's prediction, as a consistency check. */
export function ZoneCheck({ occupation }: { occupation: Occupation }) {
  const { zone, predictedZone } = occupation;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
      <span>O*NET: {zone ? `Zone ${zone}` : "Not rated"}</span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground">Model: Zone {predictedZone}</span>
      {zone ? (
        zone === predictedZone ? (
          <Badge variant="success">Same</Badge>
        ) : (
          <Badge variant="warning">Differs</Badge>
        )
      ) : (
        <Badge>Model only</Badge>
      )}
      <InfoPopover>
        <p className="font-bold">What's this?</p>
        <p className="text-muted-foreground">
          O*NET rates how much preparation a job needs (Job Zone 2 to 5). Our model predicts the same from the job's
          skills and tools. When they agree, it's a sign the data is consistent. It doesn't change your score.
        </p>
        <p className="text-sm text-muted-foreground">
          Cross-validated accuracy is about 70%. See{" "}
          <Link href="/how-it-works" className="underline underline-offset-2">
            How it works
          </Link>
          .
        </p>
      </InfoPopover>
    </div>
  );
}

export function OccupationCard({ match, fieldName }: { match: Match; fieldName: string }) {
  const o = match.occupation;
  return (
    <Link
      href={`/career/${o.code}`}
      className="flex items-center gap-6 rounded-card border border-border bg-card px-6 py-5 transition-colors hover:border-foreground/40 max-sm:px-4 max-sm:py-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-bold">{o.title}</p>
        <p className="text-sm text-muted-foreground">
          {fieldName} · {zoneShort(o.zone)}
          <span className="sm:hidden">
            {" "}
            · {match.have.length} of {match.toolsTotal} tools
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <FitScoreInline score={match.total} />
        <p className="text-sm text-muted-foreground max-sm:hidden">
          {match.have.length} of {match.toolsTotal} tools
        </p>
      </div>
    </Link>
  );
}

export function CourseLinks({ topic, className }: { topic: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <span className="text-sm text-subtle">Find courses</span>
      {courseLinks(topic).map(l => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={linkClass}>
          {l.label}
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

export function PlanStepItem({ step, index }: { step: PlanStep; index: number }) {
  return (
    <li className="flex items-start gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card font-semibold">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-bold">{step.title}</p>
        <p className="text-muted-foreground">{step.why}</p>
        <CourseLinks topic={step.searchTopic} />
      </div>
    </li>
  );
}
