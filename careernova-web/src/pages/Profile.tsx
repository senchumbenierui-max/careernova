import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Link, useLocation, useParams } from "wouter";
import { CvUpload } from "@/components/cv-upload";
import { Container } from "@/components/layout";
import { ToolSearch } from "@/components/tool-search";
import { AddChip, RemovableChip, ToolChip } from "@/components/ui/token";
import { Button, linkClass } from "@/components/ui/button";
import { Checkbox, RadioList } from "@/components/ui/controls";
import { Banner } from "@/components/ui/feedback";
import { EDUCATION_OPTIONS, MAX_INTERESTS, POPULAR_TOOLS, SKILLS, SKILL_DESCRIPTIONS } from "@/lib/constants";
import { useData } from "@/lib/data";
import { emptyProfile, saveProfile, useProfile } from "@/lib/profile";
import type { Profile, Tool } from "@/lib/types";
import { cn, joinNames } from "@/lib/utils";

const STEPS = [
  { slug: "about", label: "About you" },
  { slug: "tools", label: "Tools" },
  { slug: "skills", label: "Core skills" },
  { slug: "interests", label: "Interests" },
  { slug: "review", label: "Review" },
] as const;

/** Shown first on the interests step; the rest sit behind "Show all 23 fields". */
const FEATURED_FIELDS = ["15", "17", "19", "29", "13", "27"];

function Stepper({ current, furthest, onGo }: { current: number; furthest: number; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Profile steps" className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Step {current + 1} of {STEPS.length}
          <span className="sm:hidden"> · {STEPS[current].label}</span>
        </p>
        {current === 2 && <p className="text-subtle sm:hidden">About 2 min</p>}
      </div>
      <ol className="flex gap-1 sm:gap-1.5">
        {STEPS.map((s, i) => {
          const done = i <= current;
          const reachable = i <= furthest && i !== current;
          const label = (
            <>
              <span className={cn("block h-[3px] w-full rounded-[2px]", done ? "bg-score" : "bg-track")} aria-hidden />
              <span
                className={cn(
                  "mt-2 block text-left text-sm max-sm:sr-only",
                  i === current ? "font-semibold text-foreground" : i < current ? "text-muted-foreground" : "text-subtle",
                )}
              >
                {s.label}
              </span>
            </>
          );
          return (
            <li key={s.slug} className="min-w-0 flex-1" aria-current={i === current ? "step" : undefined}>
              {reachable ? (
                <button type="button" onClick={() => onGo(i)} className="w-full rounded-sm hover:opacity-80">
                  {label}
                </button>
              ) : (
                label
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepHeading({ title, intro, headingRef }: { title: string; intro?: ReactNode; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h1 ref={headingRef} tabIndex={-1} className="text-display-3 outline-none">
        {title}
      </h1>
      {intro && <p className="text-lg leading-[26px] text-muted-foreground max-sm:text-base max-sm:leading-[22px]">{intro}</p>}
    </div>
  );
}

function SkillRating({ index, value, onChange }: { index: number; value: number; onChange: (v: number) => void }) {
  const name = SKILLS[index];
  const id = `skill-${index}`;
  return (
    <div className="flex flex-col gap-3 py-5 [&+&]:border-t [&+&]:border-border">
      <div className="flex flex-col gap-0.5">
        <p id={id} className="font-medium">
          {name}
        </p>
        <p className="text-sm text-muted-foreground">{SKILL_DESCRIPTIONS[name]}</p>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupPrimitive.Root
          aria-labelledby={id}
          value={String(value)}
          onValueChange={v => onChange(Number(v))}
          orientation="horizontal"
          className="flex gap-2"
        >
          {[1, 2, 3, 4, 5].map(n => (
            <RadioGroupPrimitive.Item
              key={n}
              value={String(n)}
              aria-label={`${n}${n === 1 ? ", new to it" : n === 5 ? ", very strong" : ""}`}
              className="grid size-11 place-items-center rounded-element border border-border bg-card font-medium data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:font-bold data-[state=checked]:text-primary-foreground"
            >
              {n}
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => onChange(3)} aria-label={`${name}: not sure, set to 3`} className="text-muted-foreground">
          Not sure
        </Button>
      </div>
      <div className="flex w-[236px] justify-between whitespace-pre text-sm text-subtle" aria-hidden>
        <span>1  New to it</span>
        <span>5  Very strong</span>
      </div>
    </div>
  );
}

function FieldCard({
  name,
  count,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  count: number;
  checked: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col gap-1 rounded-card border bg-card p-4 transition-colors",
        checked ? "border-primary shadow-[inset_0_0_0_1px_var(--primary)]" : "border-border hover:border-foreground/40",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-medium">{name}</span>
        <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChange} size="sm" className="mt-px" />
      </span>
      <span className="text-sm text-muted-foreground">{count} careers</span>
    </label>
  );
}

function skillSummary(skills: number[]) {
  if (skills.every(s => s === 3)) return 'All 10 skills left at 3 ("Not sure").';
  const max = Math.max(...skills);
  const min = Math.min(...skills);
  const names = (v: number) => SKILLS.filter((_, i) => skills[i] === v);
  const parts = [`Strongest: ${joinNames(names(max))} (${max}).`];
  if (min < max) parts.push(`Lowest: ${joinNames(names(min))} (${min}).`);
  const atThree = skills.filter(s => s === 3).length;
  if (atThree && max !== 3 && min !== 3) parts.push(`${atThree} ${atThree === 1 ? "skill" : "skills"} left at 3.`);
  return parts.join(" ");
}

export default function ProfilePage() {
  const data = useData();
  const stored = useProfile();
  const profile = stored ?? emptyProfile();
  const [, navigate] = useLocation();
  const params = useParams<{ step?: string }>();
  const current = Math.max(0, STEPS.findIndex(s => s.slug === params.step));
  const [furthest, setFurthest] = useState(() => (stored?.completedAt ? STEPS.length - 1 : current));
  const [error, setError] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    setFurthest(f => Math.max(f, current));
    setError(null);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [current]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const update = (patch: Partial<Profile>) => saveProfile({ ...profile, ...patch });
  const owned = useMemo(() => new Set(profile.tools), [profile.tools]);
  const toolByName = (name: string) => data.toolByName.get(name.toLowerCase());
  const go = (i: number) => navigate(`/profile/${STEPS[i].slug}`);

  function addTools(tools: Tool[]) {
    const next = [...profile.tools, ...tools.map(t => t.full).filter(n => !owned.has(n))];
    update({ tools: next });
    return next;
  }

  function validate(step: number): string | null {
    if (step === 2 && profile.tools.length === 0 && profile.skills.every(s => s === 3)) {
      return "Add at least 1 tool or rate at least one skill to continue.";
    }
    if (step === 3 && profile.interests.length === 0) return "Pick at least 1 field to continue.";
    return null;
  }

  function next() {
    const problem = validate(current);
    if (problem) {
      setError(problem);
      return;
    }
    if (current < STEPS.length - 1) {
      go(current + 1);
      return;
    }
    const firstInvalid = [2, 3].find(s => validate(s));
    if (firstInvalid !== undefined) {
      go(firstInvalid);
      return;
    }
    saveProfile({ ...profile, completedAt: new Date().toISOString() });
    navigate("/results");
  }

  const errorBanner = error && (
    <div ref={errorRef} tabIndex={-1} className="outline-none">
      <Banner status="error" title={error} />
    </div>
  );

  let body: ReactNode;
  switch (STEPS[current].slug) {
    case "about":
      body = (
        <>
          <StepHeading headingRef={headingRef} title="About you" />
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="font-medium text-muted-foreground">
              Name (optional)
            </label>
            <p id="name-hint" className="text-sm text-muted-foreground">
              Only used to greet you. Stays on this device.
            </p>
            <input
              id="name"
              aria-describedby="name-hint"
              autoComplete="given-name"
              maxLength={60}
              value={profile.name ?? ""}
              onChange={e => update({ name: e.target.value })}
              className="h-9 rounded-element border border-border bg-card px-2.5 placeholder:text-subtle focus:border-primary focus:outline-none"
              placeholder="e.g. Asha"
            />
          </div>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 font-medium">Education level</legend>
            <RadioList
              label="Education level"
              value={profile.education}
              options={EDUCATION_OPTIONS}
              onChange={education => update({ education })}
            />
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor="branch" className="font-medium text-muted-foreground">
              Degree or branch (optional)
            </label>
            <input
              id="branch"
              maxLength={100}
              value={profile.branch ?? ""}
              onChange={e => update({ branch: e.target.value })}
              className="h-9 rounded-element border border-border bg-card px-2.5 placeholder:text-subtle focus:border-primary focus:outline-none"
              placeholder="e.g. B.Tech Computer Science"
            />
          </div>
        </>
      );
      break;

    case "tools": {
      const added = profile.tools.map(full => data.toolByFull.get(full)).filter((t): t is Tool => !!t);
      const popular = POPULAR_TOOLS.map(toolByName).filter((t): t is Tool => !!t && !owned.has(t.full));
      body = (
        <>
          <StepHeading
            headingRef={headingRef}
            title="Your tools and technologies"
            intro={`Add the software you have actually used, in class, projects or work. Search from ${data.tools.length} known tools, or tap a popular one.`}
          />
          <ToolSearch
            tools={data.tools}
            selected={owned}
            onAdd={t => addTools([t])}
            onRemoveLast={() => update({ tools: profile.tools.slice(0, -1) })}
          />
          {added.length > 0 && (
            <section className="flex flex-col gap-3" aria-label="Added tools">
              <h2 className="font-bold">Added ({added.length})</h2>
              <div className="flex flex-wrap gap-2">
                {added.map(t => (
                  <RemovableChip key={t.id} onRemove={() => update({ tools: profile.tools.filter(n => n !== t.full) })}>
                    {t.name}
                  </RemovableChip>
                ))}
              </div>
            </section>
          )}
          {popular.length > 0 && (
            <section className="flex flex-col gap-3" aria-label="Popular tools">
              <h2 className="font-bold">Popular</h2>
              <div className="flex flex-wrap gap-2">
                {popular.map(t => (
                  <AddChip key={t.id} onClick={() => addTools([t])}>
                    {t.name}
                  </AddChip>
                ))}
              </div>
            </section>
          )}
          <CvUpload
            tools={data.tools}
            owned={owned}
            onAdd={tools => {
              const before = profile.tools;
              addTools(tools);
              toast(`${tools.length} ${tools.length === 1 ? "tool" : "tools"} added from your CV`, {
                action: { label: "Undo", onClick: () => update({ tools: before }) },
              });
            }}
          />
        </>
      );
      break;
    }

    case "skills":
      body = (
        <>
          <StepHeading
            headingRef={headingRef}
            title="Rate your core skills"
            intro="1 is new to it, 5 is very strong. Not sure? Leave it at 3. Be honest: it only changes which gaps we show you."
          />
          {errorBanner}
          <div className="flex flex-col">
            {SKILLS.map((_, i) => (
              <SkillRating
                key={i}
                index={i}
                value={profile.skills[i]}
                onChange={v => update({ skills: profile.skills.map((s, j) => (j === i ? v : s)) })}
              />
            ))}
          </div>
        </>
      );
      break;

    case "interests": {
      const codes = Object.keys(data.fields).sort((a, b) => data.fields[a].localeCompare(data.fields[b]));
      const visible = showAllFields
        ? codes
        : [...FEATURED_FIELDS, ...profile.interests.filter(c => !FEATURED_FIELDS.includes(c))];
      const full = profile.interests.length >= MAX_INTERESTS;
      body = (
        <>
          <StepHeading headingRef={headingRef} title="Your interests" intro="Pick 1 to 5 fields you would like to work in." />
          {errorBanner}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Fields">
            {visible.map(code => {
              const checked = profile.interests.includes(code);
              return (
                <FieldCard
                  key={code}
                  name={data.fields[code]}
                  count={data.fieldCounts[code] ?? 0}
                  checked={checked}
                  disabled={full && !checked}
                  onChange={on =>
                    update({ interests: on ? [...profile.interests, code] : profile.interests.filter(c => c !== code) })
                  }
                />
              );
            })}
          </div>
          {full && <p className="text-sm text-muted-foreground">You can pick up to 5.</p>}
          {!showAllFields && (
            <button type="button" className={cn(linkClass, "self-start")} onClick={() => setShowAllFields(true)}>
              Show all {codes.length} fields
            </button>
          )}
        </>
      );
      break;
    }

    case "review": {
      const tools = profile.tools.map(full => data.toolByFull.get(full)).filter((t): t is Tool => !!t);
      const education = EDUCATION_OPTIONS.find(o => o.value === profile.education)?.label;
      const about = [profile.name, education ?? "Education not set", profile.branch].filter(Boolean).join(" · ");
      const Section = ({ title, step, children }: { title: string; step: number; children: ReactNode }) => (
        <section className="flex flex-col gap-2.5 border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{title}</h2>
            <Link href={`/profile/${STEPS[step].slug}`} className={linkClass} aria-label={`Edit ${title}`}>
              Edit
            </Link>
          </div>
          {children}
        </section>
      );
      body = (
        <>
          <StepHeading headingRef={headingRef} title="Check your profile" />
          <div className="flex flex-col gap-8">
            <Section title="About you" step={0}>
              <p className="text-muted-foreground">{about}</p>
            </Section>
            <Section title={`Tools (${tools.length})`} step={1}>
              {tools.length ? (
                <div className="flex flex-wrap gap-2">
                  {tools.map(t => (
                    <ToolChip key={t.id}>{t.name}</ToolChip>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tools added yet.</p>
              )}
            </Section>
            <Section title="Core skills" step={2}>
              <p className="text-muted-foreground">{skillSummary(profile.skills)}</p>
            </Section>
            <Section title={`Interests (${profile.interests.length})`} step={3}>
              <p className="text-muted-foreground">
                {profile.interests.length ? profile.interests.map(c => data.fields[c]).join(" · ") : "No fields picked yet."}
              </p>
            </Section>
          </div>
        </>
      );
      break;
    }
  }

  const isLast = current === STEPS.length - 1;
  return (
    <>
      <Container className="max-w-[640px] px-5 pb-8 pt-7 md:box-content md:px-10 md:pb-24 md:pt-[72px]">
        <div className="flex flex-col gap-7 md:gap-12">
          <Stepper current={current} furthest={furthest} onGo={go} />
          <div key={current} className="animate-step flex flex-col gap-7 md:gap-12">
            {body}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-6 max-md:hidden">
            {current > 0 ? (
              <Button variant="ghost" onClick={() => go(current - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              {current === 3 && <p className="text-sm text-muted-foreground">{profile.interests.length} of 5 selected</p>}
              {!isLast && <p className="text-sm text-subtle">Saved on this device</p>}
              <Button size={isLast ? "lg" : "md"} onClick={next}>
                {isLast ? "Find my careers" : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      </Container>
      <div className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-background px-5 pb-6 pt-3 md:hidden">
        {current > 0 && (
          <Button variant="secondary" size="lg" onClick={() => go(current - 1)}>
            Back
          </Button>
        )}
        <Button size="lg" className="flex-1" onClick={next}>
          {isLast ? "Find my careers" : "Continue"}
        </Button>
      </div>
    </>
  );
}
