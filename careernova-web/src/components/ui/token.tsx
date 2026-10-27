import { Check, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipState = "have" | "missing" | "neutral" | "add";

const STATES: Record<ChipState, string> = {
  have: "bg-have-bg text-have-fg",
  missing: "bg-missing-bg text-missing-fg",
  neutral: "bg-neutral text-foreground",
  add: "bg-neutral text-foreground hover:bg-neutral-hover",
};

const ICONS: Partial<Record<ChipState, ReactNode>> = {
  have: <Check className="size-3" aria-hidden />,
  missing: <Plus className="size-3" aria-hidden />,
  add: <Plus className="size-3" aria-hidden />,
};

const SR_PREFIX: Partial<Record<ChipState, string>> = {
  have: "You have ",
  missing: "Missing ",
};

const base = "inline-flex h-6 max-w-full items-center gap-1 rounded-inner px-2 text-sm";

/** Tool chip: never color alone, so have/missing always carry an icon and screen-reader text. */
export function ToolChip({ state = "neutral", children }: { state?: ChipState; children: ReactNode }) {
  return (
    <span className={cn(base, STATES[state])}>
      {ICONS[state]}
      {SR_PREFIX[state] && <span className="sr-only">{SR_PREFIX[state]}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function AddChip({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(base, STATES.add)} aria-label={`Add ${children}`}>
      {ICONS.add}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function RemovableChip({ onRemove, children }: { onRemove: () => void; children: string }) {
  return (
    <span className={cn(base, STATES.neutral)}>
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${children}`}
        className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-neutral-hover hover:text-foreground"
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}
