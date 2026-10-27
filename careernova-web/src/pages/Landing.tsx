import { Link } from "wouter";
import { Container } from "@/components/layout";
import { ScoreBreakdown, FitScore } from "@/components/score";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, linkClass } from "@/components/ui/button";
import { useData } from "@/lib/data";
import { PART_LABELS, type ScorePart } from "@/lib/match";
import { formatNumber } from "@/lib/utils";

// Clearly labelled sample on the landing page ("Example data"), not a real result
const SAMPLE_PARTS: ScorePart[] = [
  { key: "tools", label: PART_LABELS.tools, points: 22, max: 40, reason: "" },
  { key: "skills", label: PART_LABELS.skills, points: 24, max: 30, reason: "" },
  { key: "interest", label: PART_LABELS.interest, points: 15, max: 15, reason: "" },
  { key: "prep", label: PART_LABELS.prep, points: 12, max: 15, reason: "" },
];

const STEPS = [
  {
    title: "Tell us your skills",
    body: "The tools you know, a quick 1 to 5 rating of 10 core skills, and the fields you like. You can upload a CV to pre-fill tools.",
  },
  {
    title: "See matched careers with reasons",
    body: "Each match shows its score in four parts, with the tools you have and the ones you are missing.",
  },
  {
    title: "Get your skill-gap plan",
    body: "A short 30 to 60 day plan for the gaps that matter most, with links to free course searches.",
  },
];

export default function LandingPage() {
  const { occupations, tools } = useData();
  const total = formatNumber(occupations.length);
  const inDemand = tools.filter(t => t.kind === "in-demand").length;

  return (
    <>
      <Container className="flex flex-col gap-12 pb-16 pt-12 lg:flex-row lg:items-center lg:gap-24 lg:pb-32 lg:pt-28">
        <div className="flex flex-col gap-7 lg:w-[580px]">
          <h1 className="text-display-1 lg:text-hero lg:tracking-[-0.01em]">Find careers that fit what you can already do.</h1>
          <p className="max-w-[480px] text-lg leading-7 text-muted-foreground max-sm:text-base max-sm:leading-[22px]">
            Tell us your tools and skills. We match you against {total} real occupations and show the reason behind every
            score, plus what to learn next.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/profile" size="lg">
              Build my profile
            </ButtonLink>
            <ButtonLink href="/explore" variant="secondary" size="lg">
              Explore {total} careers
            </ButtonLink>
          </div>
          <p className="text-sm text-subtle">No sign-up. Your profile stays on this device.</p>
        </div>

        <section
          aria-label="Sample result"
          className="flex w-full flex-col gap-7 rounded-card border border-border bg-card p-6 sm:p-8 lg:w-[472px] lg:shrink-0"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Sample result</p>
            <Badge>Example data</Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-h2 font-semibold">Software Developers</p>
            <p className="text-sm text-muted-foreground">Computer &amp; Mathematical · Zone 4 · Considerable preparation</p>
          </div>
          <FitScore score={73} animate={false} />
          <ScoreBreakdown parts={SAMPLE_PARTS} showReason={false} />
          <p className="text-sm text-muted-foreground">Every number has a reason you can read.</p>
        </section>
      </Container>

      <section className="border-t border-border">
        <Container className="flex flex-col gap-8 py-16 lg:flex-row lg:gap-24 lg:py-24">
          <div className="flex flex-col gap-3 lg:w-[320px] lg:shrink-0">
            <h2 className="text-display-3">How it works</h2>
            <p className="text-muted-foreground max-sm:hidden">Three steps, about five minutes.</p>
          </div>
          <ol className="flex flex-1 flex-col lg:max-w-[672px]">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-8 border-border py-7 first:pt-0 [&+&]:border-t max-sm:gap-4">
                <span className="font-mono text-subtle">0{i + 1}</span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-t border-border">
        <Container className="flex flex-col gap-12 py-16 lg:py-24">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-24">
            <h2 className="text-display-3 lg:w-[320px] lg:shrink-0">Real data. Every score explained.</h2>
            <p className="text-lg leading-7 text-muted-foreground lg:max-w-[672px] max-sm:text-base max-sm:leading-[22px]">
              Occupations, skills and tools come from O*NET, the U.S. Department of Labor's occupation database. It is
              U.S.-based: the occupations and tools translate well, though local job titles may differ. Nothing is a black
              box, and no score is a probability.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
            {[
              [total, "occupations"],
              [String(inDemand), "in-demand tools"],
              ["10", "core skills compared"],
              ["4", "visible parts in every score"],
            ].map(([value, label], i) => (
              <div key={label} className={i % 4 ? "md:border-l md:border-border md:pl-8" : ""}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-display-3">{value}</dd>
                <dd className="text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
          <Link href="/how-it-works" className={linkClass}>
            How the matching works
          </Link>
        </Container>
      </section>
    </>
  );
}
