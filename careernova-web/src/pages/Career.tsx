import * as Collapsible from "@radix-ui/react-collapsible";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "wouter";
import { JobZoneBadge, PlanStepItem, ZoneCheck } from "@/components/career-bits";
import { Container } from "@/components/layout";
import { FitScore, ScoreBreakdown } from "@/components/score";
import { SkillsChart } from "@/components/skills-chart";
import { ButtonLink, buttonClass, linkClass } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { ToolChip, type ChipState } from "@/components/ui/token";
import { ZONE_NEEDS } from "@/lib/constants";
import { useData, useSoftwareList } from "@/lib/data";
import { buildPlan, matchOccupation, ownedToolIds, relatedOccupations } from "@/lib/match";
import { hasResults, useProfile } from "@/lib/profile";
import type { Tool } from "@/lib/types";
import { cn } from "@/lib/utils";
import NotFoundPage from "./NotFound";

const CHIP_LIMIT = 12;

function ChipList({ tools, state }: { tools: Tool[]; state: ChipState }) {
  const [all, setAll] = useState(false);
  const shown = all ? tools : tools.slice(0, CHIP_LIMIT);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {shown.map(t => (
          <ToolChip key={t.id} state={state}>
            {t.name}
          </ToolChip>
        ))}
      </div>
      {tools.length > CHIP_LIMIT && (
        <button type="button" className={cn(linkClass, "self-start")} onClick={() => setAll(a => !a)}>
          {all ? "Show fewer" : `Show all ${tools.length}`}
        </button>
      )}
    </>
  );
}

function Section({ title, intro, id, children }: { title: string; intro?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-6 border-t border-border pt-10" aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="flex flex-col gap-1.5">
        <h2 id={id ? `${id}-h` : undefined} className="text-h2 font-semibold">
          {title}
        </h2>
        {intro && <p className="text-muted-foreground max-sm:text-sm">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function SoftwareList({ code, count }: { code: string; count: number }) {
  const [open, setOpen] = useState(false);
  const list = useSoftwareList(code, open);
  if (!count) return null;
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
      <Collapsible.Trigger className={cn(linkClass, "self-start")}>
        {open ? "Hide full software list" : `Full software list (${count})`}
      </Collapsible.Trigger>
      <Collapsible.Content>
        {list === null ? (
          <p className="text-muted-foreground" role="status">
            Loading…
          </p>
        ) : (
          <p className="text-muted-foreground">{list.join(" · ")}</p>
        )}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function AlsoUseful({ tools, state }: { tools: Tool[]; state: ChipState }) {
  if (!tools.length) return null;
  return (
    <Collapsible.Root className="flex flex-col border-t border-border">
      <Collapsible.Trigger className="group flex items-center justify-between py-4 text-left">
        <span className="font-bold">Also useful: hot technologies ({tools.length})</span>
        <span className="font-medium text-muted-foreground">
          <span className="group-data-[state=open]:hidden">Show</span>
          <span className="hidden group-data-[state=open]:inline">Hide</span>
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content className="flex flex-col gap-3 pb-4">
        <ChipList tools={tools} state={state} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 160;
  return (
    <div className="flex flex-col gap-2">
      <p className={cn("max-w-[760px] text-lg leading-7 text-muted-foreground max-sm:text-base max-sm:leading-[22px]", !open && long && "max-sm:line-clamp-3")}>
        {text}
      </p>
      {long && (
        <button type="button" className={cn(linkClass, "self-start sm:hidden")} onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

export default function CareerPage() {
  const { code } = useParams<{ code: string }>();
  const data = useData();
  const profile = useProfile();
  const occupation = data.byCode.get(code);
  const withProfile = hasResults(profile);

  const match = useMemo(() => {
    if (!occupation || !withProfile) return null;
    const owned = ownedToolIds(profile, data.toolByFull);
    return matchOccupation(occupation, profile, data.tools, owned, data.fields[occupation.field]);
  }, [occupation, profile, withProfile, data]);

  const related = useMemo(() => {
    if (!occupation) return [];
    const owned = withProfile ? ownedToolIds(profile, data.toolByFull) : null;
    return relatedOccupations(occupation, data.occupations).map(o => ({
      occupation: o,
      score: owned && withProfile ? matchOccupation(o, profile, data.tools, owned, data.fields[o.field]).total : null,
    }));
  }, [occupation, profile, withProfile, data]);

  if (!occupation) return <NotFoundPage />;

  const o = occupation;
  const fieldName = data.fields[o.field];
  const inDemand = o.inDemand.map(id => data.tools[id]);
  const hot = o.hot.map(id => data.tools[id]);
  const plan = match ? buildPlan(match) : [];

  const header = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-muted-foreground">{fieldName}</span>
        <span className="font-mono text-subtle">{o.code}</span>
      </div>
      <h1 className="text-display-2 max-sm:text-display-3">{o.title}</h1>
      <Description text={o.description} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <JobZoneBadge zone={o.zone} />
        {o.zone && <p className="text-sm text-muted-foreground">Usually needs {ZONE_NEEDS[o.zone]}</p>}
      </div>
      <ZoneCheck occupation={o} />
    </div>
  );

  const relatedSection = related.length > 0 && (
    <Section title="Related careers" intro="Same field, similar tools.">
      <ul className="flex flex-col">
        {related.map(({ occupation: r, score }) => (
          <li key={r.code} className="[&+&]:border-t [&+&]:border-border">
            <Link href={`/career/${r.code}`} className="flex items-center justify-between gap-4 py-3.5 hover:underline">
              <span className="font-medium">{r.title}</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {r.zone ? `Zone ${r.zone}` : "Job Zone not rated"}
                {score !== null && ` · ${score} match`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );

  if (!match) {
    return (
      <Container className="flex flex-col gap-10 pb-16 pt-8 md:pb-24 md:pt-10">
        <Link href="/explore" className={cn(linkClass, "self-start")}>
          Back to explore
        </Link>
        {header}
        <div className="flex max-w-[760px] flex-col gap-4">
          <Banner
            status="info"
            title="See how you fit this career"
            description="Build a profile in about 5 minutes to get your match score and a plan."
          />
          <ButtonLink href="/profile" className="self-start">
            Build my profile
          </ButtonLink>
        </div>
        <div className="flex max-w-[760px] flex-col gap-10">
          <section className="flex flex-col gap-3">
            <h2 className="font-bold">Most wanted tools ({inDemand.length})</h2>
            {inDemand.length ? <ChipList tools={inDemand} state="neutral" /> : <p className="text-muted-foreground">No software listed.</p>}
            <AlsoUseful tools={hot} state="neutral" />
            <SoftwareList code={o.code} count={o.softwareCount} />
          </section>
          {relatedSection}
        </div>
      </Container>
    );
  }

  const aside = (
    <aside className="flex flex-col gap-6 rounded-card border border-border bg-card p-6 lg:sticky lg:top-6 lg:w-[312px] lg:shrink-0 lg:p-7">
      <p className="text-sm text-muted-foreground max-lg:sr-only">Your match</p>
      <FitScore score={match.total} />
      <dl className="flex flex-col gap-2.5 max-lg:hidden">
        {[
          ["Tools you have", inDemand.length ? `${match.inDemandHave} of ${inDemand.length}` : `${match.have.length} of ${match.toolsTotal}`],
          ["Skills below level", match.skillRows.length ? `${match.belowCount} of 10` : "No data"],
          ["Preparation", o.zone ? `Zone ${o.zone}` : `Zone ${o.predictedZone} (predicted)`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <a href="#plan" className={buttonClass("primary", "md", "w-full max-lg:hidden")}>
        Jump to my plan
      </a>
      <p className="text-sm text-subtle max-lg:hidden">A match score shows overlap with your profile. It is not a chance of success.</p>
    </aside>
  );

  return (
    <Container className="flex flex-col gap-10 pb-16 pt-8 md:gap-12 md:pb-24 md:pt-10">
      <Link href="/results" className={cn(linkClass, "self-start")}>
        Back to results
      </Link>
      {header}
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-20">
        <div className="lg:order-2">{aside}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-12 lg:order-1 lg:max-w-[696px]">
          <Section
            title="Why this fits you"
            intro={`Your match score is ${match.total} out of 100. It adds up four parts. It is not a probability of getting the job.`}
          >
            <ScoreBreakdown parts={match.parts} />
          </Section>

          <Section
            title="Tools"
            intro="A check means you already know the tool. A plus marks tools employers ask for most that you have not added yet."
          >
            <div className="flex flex-col gap-3">
              <h3 className="font-bold">You have ({match.have.length})</h3>
              {match.have.length ? (
                <ChipList tools={match.have} state="have" />
              ) : (
                <p className="text-muted-foreground">None of this career's listed tools yet.</p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-bold">Most wanted, missing ({match.missingInDemand.length})</h3>
              {match.missingInDemand.length ? (
                <ChipList tools={match.missingInDemand} state="missing" />
              ) : (
                <p className="text-muted-foreground">
                  {inDemand.length ? "You have every in-demand tool for this career." : "O*NET lists no in-demand tools for this career."}
                </p>
              )}
            </div>
            <AlsoUseful tools={match.missingHot} state="neutral" />
            <SoftwareList code={o.code} count={o.softwareCount} />
          </Section>

          <Section title="Core skills: you vs needed" intro="Needed levels come from O*NET (1 to 7) and are shown on your 1 to 5 scale.">
            {match.skillRows.length ? (
              <SkillsChart rows={match.skillRows} />
            ) : (
              <p className="text-muted-foreground">O*NET has no skill ratings for this career.</p>
            )}
          </Section>

          <Section id="plan" title="Your plan for the next 30 to 60 days" intro="Built from your biggest gaps. Each step takes about one to two weeks.">
            <ol className="flex flex-col gap-6">
              {plan.map((step, i) => (
                <PlanStepItem key={step.title} step={step} index={i} />
              ))}
            </ol>
          </Section>

          {relatedSection}
        </div>
      </div>
    </Container>
  );
}
