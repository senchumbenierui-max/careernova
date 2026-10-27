import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "success" | "warning";

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-badge-bg text-badge-fg",
  success: "bg-badge-success text-white",
  warning: "bg-badge-warning text-[#171717]",
};

export function Badge({ variant = "neutral", className, children }: { variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
