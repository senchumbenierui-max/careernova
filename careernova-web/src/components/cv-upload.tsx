import { ArrowUp, Loader2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { CV_ERROR_MESSAGES, CvReadError, findTools, readCvText, type CvError } from "@/lib/cv";
import type { Tool } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/controls";
import { Banner } from "./ui/feedback";

type State =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "review"; fileName: string; found: Tool[]; picked: Set<number> }
  | { kind: "nothing" }
  | { kind: "error"; error: CvError };

export function CvUpload({ tools, owned, onAdd }: { tools: Tool[]; owned: Set<string>; onAdd: (tools: Tool[]) => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setState({ kind: "reading" });
    try {
      const text = await readCvText(file);
      const found = findTools(text, tools).filter(t => !owned.has(t.full));
      setState(
        found.length
          ? { kind: "review", fileName: file.name, found, picked: new Set(found.map(t => t.id)) }
          : { kind: "nothing" },
      );
    } catch (e) {
      setState({ kind: "error", error: e instanceof CvReadError ? e.kind : "unreadable" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files[0]);
  }

  if (state.kind === "review") {
    const count = state.picked.size;
    return (
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6" role="region" aria-label="Tools found in your CV">
        <p className="font-bold">
          We found {state.found.length} {state.found.length === 1 ? "tool" : "tools"} in {state.fileName}
        </p>
        <p className="text-muted-foreground">Untick anything you have not really used.</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {state.found.map(t => (
            <label key={t.id} className="flex cursor-pointer items-center gap-2 py-1 font-medium">
              <Checkbox
                size="sm"
                checked={state.picked.has(t.id)}
                onCheckedChange={on => {
                  const picked = new Set(state.picked);
                  if (on) picked.add(t.id);
                  else picked.delete(t.id);
                  setState({ ...state, picked });
                }}
              />
              <span className="truncate">{t.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <Button
            disabled={count === 0}
            onClick={() => {
              onAdd(state.found.filter(t => state.picked.has(t.id)));
              setState({ kind: "idle" });
            }}
          >
            Add {count} {count === 1 ? "tool" : "tools"}
          </Button>
          <Button variant="ghost" onClick={() => setState({ kind: "idle" })}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const error = state.kind === "error" ? state.error : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col">
        <label htmlFor="cv-input" className="font-medium text-muted-foreground">
          Or pre-fill from your CV (optional)
        </label>
        <p id="cv-hint" className="text-sm text-muted-foreground">
          PDF, DOCX or TXT, up to 8 MB. Not stored. You review the tools before they are added.
        </p>
      </div>
      <div className={cn("flex flex-col rounded-element", error && "bg-error-bg")}>
        <label
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-element border border-dashed border-border bg-card px-4 text-center text-muted-foreground transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus hover:border-foreground/40",
            state.kind === "reading" ? "h-[68px]" : "h-24",
            dragging && "border-score bg-missing-bg/30",
            error && "border-error shadow-[inset_0_0_0_3px_rgba(227,63,74,0.3)]",
          )}
        >
          {state.kind === "reading" ? (
            <>
              <Loader2 className="size-5 animate-spin text-foreground" aria-hidden />
              <span className="sr-only" role="status">
                Reading your CV
              </span>
            </>
          ) : (
            <>
              <ArrowUp className="size-5 text-foreground" aria-hidden />
              <span>Drop your CV here or choose a file</span>
            </>
          )}
          <input
            id="cv-input"
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            aria-describedby={error ? "cv-hint cv-error" : "cv-hint"}
            className="sr-only"
            disabled={state.kind === "reading"}
            onChange={e => handle(e.target.files?.[0])}
          />
        </label>
        {error && (
          <p id="cv-error" role="alert" className="p-2 text-sm text-error-fg">
            {CV_ERROR_MESSAGES[error]}
          </p>
        )}
      </div>
      {state.kind === "nothing" && (
        <Banner
          status="warning"
          className="mt-3"
          title="No tools found in this file."
          description="That can happen with scanned or image-only CVs. Add your tools with the search above instead."
        />
      )}
    </div>
  );
}
