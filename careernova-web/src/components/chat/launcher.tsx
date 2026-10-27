import * as Dialog from "@radix-ui/react-dialog";
import { MessageCircle, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { useDataState } from "@/lib/data";

const ChatPanel = lazy(() => import("./panel"));

/** "Ask CareerNova" button, on every page except the profile steps, where it would cover the step buttons */
export function ChatLauncher() {
  const state = useDataState();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  // Following a career link from an answer closes the panel; the chat is kept for this tab
  useEffect(() => setOpen(false), [location]);

  if (state.status !== "ready" || location.startsWith("/profile")) return null;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={buttonClass("primary", "lg", "fixed bottom-5 right-5 z-30 h-11 rounded-full px-4 shadow-popover")}
      >
        <MessageCircle className="size-4" aria-hidden />
        Ask CareerNova
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-background sm:left-auto sm:w-[420px] sm:border-l sm:border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-lg font-semibold">Ask CareerNova</Dialog.Title>
            <Dialog.Close className={buttonClass("ghost", "sm", "size-7 px-0")} aria-label="Close chat">
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Chat assistant that answers career questions from CareerNova's data
          </Dialog.Description>
          <Suspense
            fallback={
              <div className="flex flex-col gap-3 p-4" aria-busy="true">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            }
          >
            <ChatPanel />
          </Suspense>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
