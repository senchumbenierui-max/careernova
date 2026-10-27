import { AlertTriangle, Inbox, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Status = "info" | "warning" | "error";

const BANNER: Record<Status, { box: string; icon: ReactNode }> = {
  info: { box: "bg-missing-bg text-missing-fg", icon: <Info className="size-5" aria-hidden /> },
  warning: { box: "bg-warning-bg text-warning-fg", icon: <AlertTriangle className="size-5" aria-hidden /> },
  error: { box: "bg-error-bg text-error-fg", icon: <XCircle className="size-5" aria-hidden /> },
};

export function Banner({
  status,
  title,
  description,
  className,
  id,
  tabIndex,
}: {
  status: Status;
  title: string;
  description?: ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
}) {
  return (
    <div
      id={id}
      tabIndex={tabIndex}
      role={status === "error" ? "alert" : "status"}
      className={cn("flex w-full items-start gap-2 rounded-card px-4 py-3", BANNER[status].box, className)}
    >
      <span className="shrink-0">{BANNER[status].icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
  icon = <Inbox className="size-6" aria-hidden />,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-7 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="text-foreground">{icon}</span>
        <div className="max-w-[360px]">
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-inner bg-skeleton", className)} aria-hidden />;
}
