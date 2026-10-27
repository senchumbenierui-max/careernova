import { ArrowUp, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useRoute } from "wouter";
import { Button, linkClass } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Banner, Skeleton } from "@/components/ui/feedback";
import {
  ChatError,
  readChatSettings,
  readHistory,
  streamChat,
  writeChatSettings,
  writeHistory,
  type ChatSettings,
  type StoredMessage,
} from "@/lib/chat/client";
import { buildChatRequest, chatMode } from "@/lib/chat/context";
import { LIMITS } from "@/lib/chat/protocol";
import { useData } from "@/lib/data";
import { hasResults, useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { Answer } from "./answer";

interface Message extends StoredMessage {
  pending?: boolean;
}

const GENERAL_SUGGESTIONS = [
  "What is a Job Zone?",
  "What does a data scientist do?",
  "Which careers use AutoCAD?",
  "How is the match score worked out?",
];

const PERSONAL_SUGGESTIONS = ["Why is my top match ranked first?", "What should I learn first?", "Compare my top two matches"];

function Notice({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-4">
      <p className="font-semibold">Before you start</p>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
        <li>
          Your question, and the CareerNova data that matches it, are sent through our server to Groq, an AI service,
          to write the answer. Our server doesn't store or log your chat.
        </li>
        <li>Answers come from CareerNova's data but are written by AI and can be wrong. Check the career pages.</li>
        <li>Don't type personal details such as your phone number or address.</li>
      </ul>
      <Button className="self-start" onClick={onAccept}>
        Got it
      </Button>
    </div>
  );
}

function Sources({ message }: { message: Message }) {
  if (!message.sources?.length || message.pending || message.error) return null;
  return (
    <details className="text-sm text-muted-foreground">
      <summary className="cursor-pointer select-none">Based on {message.sources.length} sources</summary>
      <ul className="mt-1 flex flex-col gap-0.5 pl-4">
        {message.sources.map(s => (
          <li key={s.id}>
            {s.code ? (
              <Link href={`/career/${s.code}`} className="hover:underline">
                {s.title}
              </Link>
            ) : (
              `${s.title}${s.id.startsWith("tool:") ? " (tool)" : ""}`
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ChatPanel() {
  const data = useData();
  const profile = useProfile();
  const [, params] = useRoute("/career/:code");
  const viewingCode = params?.code && data.byCode.has(params.code) ? params.code : undefined;

  const [settings, setSettings] = useState<ChatSettings>(readChatSettings);
  const [messages, setMessages] = useState<Message[]>(readHistory);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const finished = hasResults(profile);
  const mode = chatMode(profile, settings.sharesProfile);
  const busy = messages.some(m => m.pending);

  const updateSettings = (patch: Partial<ChatSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeChatSettings(next);
  };

  useEffect(() => {
    if (!busy) writeHistory(messages.map(({ pending: _, ...m }) => m));
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function patchLast(patch: Partial<Message>) {
    setMessages(prev => [...prev.slice(0, -1), { ...prev[prev.length - 1], ...patch }]);
  }

  async function send(text: string, base: Message[] = messages) {
    const question = text.trim().slice(0, LIMITS.questionChars);
    if (!question || busy) return;
    setDraft("");

    const history = base.filter(m => !m.error && m.content.trim()).map(({ role, content }) => ({ role, content }));
    // The search index is built on the first question (about 50 ms), not when the chat opens
    const { request, sources } = buildChatRequest({
      question,
      history,
      profile,
      sharesProfile: settings.sharesProfile,
      data,
      viewingCode,
    });
    setMessages([
      ...base,
      { role: "user", content: question },
      { role: "assistant", content: "", pending: true, sources: sources.map(c => ({ id: c.id, title: c.title, code: c.code })) },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(request, answer => patchLast({ content: answer }), controller.signal);
      patchLast({ pending: false });
    } catch (error) {
      if (controller.signal.aborted) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), last.content ? { ...last, pending: false } : { ...last, pending: false, error: "Stopped." }];
        });
      } else {
        patchLast({ pending: false, content: "", error: error instanceof ChatError ? error.message : new ChatError("upstream").message });
      }
    } finally {
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function retry() {
    const lastQuestion = messages[messages.length - 2];
    if (lastQuestion?.role !== "user") return;
    void send(lastQuestion.content, messages.slice(0, -2));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  }

  const suggestions = [
    ...(viewingCode && mode === "personal" ? [`How do I close the gap for ${data.byCode.get(viewingCode)!.title}?`] : []),
    ...(viewingCode && mode === "general" ? [`What does this career involve?`] : []),
    ...(mode === "personal" ? PERSONAL_SUGGESTIONS : GENERAL_SUGGESTIONS),
  ].slice(0, 4);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-2.5 text-sm">
        {finished ? (
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              size="sm"
              className="mt-0.5"
              checked={settings.sharesProfile}
              onCheckedChange={sharesProfile => updateSettings({ sharesProfile })}
            />
            <span>
              <span className="font-medium text-foreground">Use my profile for personal answers</span>
              <span className="block text-muted-foreground">
                Sends your education, branch, tools, skill ratings, interests and top matches. Never your name or CV.
              </span>
            </span>
          </label>
        ) : (
          <p className="text-muted-foreground">
            General questions only.{" "}
            <Link href="/profile" className={cn(linkClass, "text-sm")}>
              Build your profile
            </Link>{" "}
            for personal answers.
          </p>
        )}
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="size-7 px-0" onClick={() => setMessages([])} disabled={busy} aria-label="Clear chat" title="Clear chat">
            <Trash2 className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-busy={busy}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        {!settings.acknowledged ? (
          <Notice onAccept={() => updateSettings({ acknowledged: true })} />
        ) : messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground">
              {mode === "personal"
                ? "Ask about your matches, your skill gaps or any career."
                : "Ask about careers, Job Zones, tools, or how CareerNova works."}
            </p>
            <div className="flex flex-col items-start gap-2">
              {suggestions.map(s => (
                <Button key={s} variant="secondary" size="sm" className="h-auto min-h-7 whitespace-normal py-1 text-left" onClick={() => void send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-element bg-primary px-3 py-2 text-primary-foreground">
                {m.content}
              </p>
            ) : (
              <div key={i} className="flex flex-col gap-1.5">
                {m.error ? (
                  <div className="flex flex-col items-start gap-2">
                    <Banner status={m.error === "Stopped." ? "info" : "error"} title={m.error} />
                    {i === messages.length - 1 && (
                      <Button variant="secondary" size="sm" onClick={retry}>
                        Try again
                      </Button>
                    )}
                  </div>
                ) : m.content ? (
                  <Answer text={m.content} byCode={data.byCode} />
                ) : (
                  <div className="flex flex-col gap-2" aria-label="Writing an answer">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                )}
                <Sources message={m} />
              </div>
            ),
          )
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-border px-4 pb-4 pt-3">
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Your question
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={2}
            value={draft}
            maxLength={LIMITS.questionChars}
            disabled={!settings.acknowledged}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={mode === "personal" ? "Ask about your careers…" : "Ask a general career question…"}
            className="min-h-[52px] flex-1 resize-none rounded-element border border-border bg-card px-3 py-2 placeholder:text-subtle disabled:opacity-50"
          />
          {busy ? (
            <Button variant="secondary" className="size-9 px-0" onClick={() => abortRef.current?.abort()} aria-label="Stop answer">
              <Square className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" className="size-9 px-0" disabled={!draft.trim() || !settings.acknowledged} aria-label="Send">
              <ArrowUp className="size-4" aria-hidden />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">AI answers from CareerNova's data. They can be wrong.</p>
      </form>
    </div>
  );
}
