import { useEffect, useMemo, useRef, useState } from "react";
import { JobZoneBadge, OccupationCard } from "@/components/career-bits";
import { Container } from "@/components/layout";
import { FitScore, ScoreBreakdown } from "@/components/score";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, FilterMenu } from "@/components/ui/controls";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { ToolChip } from "@/components/ui/token";
import { EDUCATION_OPTIONS, EDUCATION_ZONE } from "@/lib/constants";
import { useData } from "@/lib/data";
import { rankAll, type Match } from "@/lib/match";
import { hasResults, isThinProfile, useProfile } from "@/lib/profile";
import { cn, plural } from "@/lib/utils";

const PAGE = 10;
const WEAK_THRESHOLD = 40;

function TopMatch({ match, fieldName }: { match: Match; fieldName: string }) {
  const o = match.occupation;
  return (
    <section
      aria-label="Top match"
      className="flex flex-col gap-10 rounded-card border border-border bg-card p-5 sm:p-10 max-sm:gap-6"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-[72px]">
        <div className="flex flex-col gap-5 lg:w-[380px] lg:shrink-0">
          <p className="text-sm text-muted-foreground">Top match</p>
          <h2 className="text-h1 font-semibold">{o.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">{fieldName}</span>
            <JobZoneBadge zone={o.zone} />
          </div>
          <FitScore score={match.total} />
          <ButtonLink href={`/career/${o.code}`} size="lg" className="self-start max-sm:hidden">
            Open career plan
          </ButtonLink>
        </div>
        <div className="flex flex-1 flex-col gap-6">
          <h3 className="font-bold max-sm:sr-only">Why this fits you</h3>
          <ScoreBreakdown parts={match.parts} />
        </div>
      </div>
      <div className="flex flex-col gap-6 border-t border-border pt-7 sm:flex-row sm:gap-[72px]">
        <div className="flex flex-1 flex-col gap-3">
          <h3 className="font-bold">You have</h3>
          {match.have.length ? (
            <div className="flex flex-wrap gap-2">
              {match.have.slice(0, 3).map(t => (
                <ToolChip key={t.id} state="have">
                  {t.name}
                </ToolChip>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">None of this career's listed tools yet.</p>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <h3 className="font-bold">Most wanted, missing</h3>
          {match.missingInDemand.length ? (
            <div className="flex flex-wrap gap-2">
              {match.missingInDemand.slice(0, 3).map(t => (
                <ToolChip key={t.id} state="missing">
                  {t.name}
                </ToolChip>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">You have every in-demand tool for this career.</p>
          )}
        </div>
      </div>
      <ButtonLink href={`/career/${o.code}`} size="lg" className="sm:hidden">
        Open career plan
      </ButtonLink>
    </section>
  );
}

export default function ResultsPage() {
  const data = useData();
  const profile = useProfile();
  const [field, setField] = useState("all");
  const [zone, setZone] = useState("any");
  const [withinEducation, setWithinEducation] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [attempt, setAttempt] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const focusIndex = useRef<number | null>(null);

  const ranked = useMemo(() => {
    if (!hasResults(profile)) return null;
    try {
      return rankAll(data.occupations, profile, data.tools, data.toolByFull, data.fields);
    } catch {
      return "error" as const;
    }
  }, [data, profile, attempt]);

  const studentZone = profile?.education ? EDUCATION_ZONE[profile.education] : null;
  const filtered = useMemo(() => {
    if (!Array.isArray(ranked)) return [];
    return ranked.slice(1).filter(m => {
      const o = m.occupation;
      if (field !== "all" && o.field !== field) return false;
      if (zone !== "any" && String(o.zone) !== zone) return false;
      if (withinEducation && studentZone && o.zone && o.zone > studentZone) return false;
      return true;
    });
  }, [ranked, field, zone, withinEducation, studentZone]);

  useEffect(() => setShown(PAGE), [field, zone, withinEducation]);

  useEffect(() => {
    if (focusIndex.current === null) return;
    const links = listRef.current?.querySelectorAll("a");
    links?.[focusIndex.current]?.focus();
    focusIndex.current = null;
  }, [shown]);

  if (!hasResults(profile)) {
    return (
      <Container className="py-16">
        <EmptyState
          title="No results on this device"
          description="Your profile may have been cleared by the browser, or you haven't built one here yet. It takes about 5 minutes."
        >
          <ButtonLink href="/profile">Build my profile</ButtonLink>
          <ButtonLink href="/explore" variant="ghost">
            Explore careers
          </ButtonLink>
        </EmptyState>
      </Container>
    );
  }

  if (isThinProfile(profile)) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Tell us a bit more first"
          description={'With no tools and all skills at "Not sure", every career scores about the same. Add at least 3 tools to see real differences.'}
        >
          <ButtonLink href="/profile/tools">Add tools</ButtonLink>
          <ButtonLink href="/profile/skills" variant="secondary">
            Rate skills
          </ButtonLink>
        </EmptyState>
      </Container>
    );
  }

  if (ranked === "error" || !ranked?.length) {
    return (
      <Container className="py-16">
        <EmptyState
          title="We couldn't load your matches"
          description="Your profile is safe on this device. Check your connection and try again."
        >
          <Button onClick={() => setAttempt(a => a + 1)}>Try again</Button>
          <ButtonLink href="/profile/review" variant="ghost">
            Edit profile
          </ButtonLink>
        </EmptyState>
      </Container>
    );
  }

  const top = ranked[0];
  const weak = top.total < WEAK_THRESHOLD;
  const fieldName = (code: string) => data.fields[code] ?? "Other";
  const education = EDUCATION_OPTIONS.find(o => o.value === profile.education)?.label;
  const rated = profile.skills.filter(s => s !== 3).length;
  const interests = profile.interests.map(fieldName);
  const activeFilters = Number(field !== "all") + Number(zone !== "any") + Number(withinEducation);

  const fieldOptions = [
    { value: "all", label: "All" },
    ...profile.interests.map(c => ({ value: c, label: fieldName(c) })),
    ...Object.keys(data.fields)
      .filter(c => !profile.interests.includes(c))
      .sort((a, b) => fieldName(a).localeCompare(fieldName(b)))
      .map(c => ({ value: c, label: fieldName(c) })),
  ];

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu label="Field" value={field} options={fieldOptions} onChange={setField} />
      <FilterMenu
        label="Preparation"
        value={zone}
        options={[
          { value: "any", label: "Any" },
          { value: "2", label: "Zone 2" },
          { value: "3", label: "Zone 3" },
          { value: "4", label: "Zone 4" },
          { value: "5", label: "Zone 5" },
        ]}
        onChange={setZone}
      />
      {studentZone && (
        <label className="flex cursor-pointer items-center gap-2 py-1 font-medium">
          <Checkbox checked={withinEducation} onCheckedChange={setWithinEducation} />
          Only careers that need my education or less
        </label>
      )}
    </div>
  );

  return (
    <Container className="flex flex-col gap-10 pb-16 pt-7 md:gap-14 md:pb-24 md:pt-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-display-3 max-sm:text-h1">
            Here's where your profile fits best{profile.name?.trim() ? `, ${profile.name.trim()}` : ""}
          </h1>
          <p className="text-muted-foreground max-sm:text-sm">
            {[
              education,
              plural(profile.tools.length, "tool"),
              rated ? `${plural(rated, "skill")} rated` : null,
              interests.length ? `Interests: ${interests.join(", ")}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <ButtonLink href="/profile/review" variant="secondary" className="self-start md:self-auto">
          Edit profile
        </ButtonLink>
      </div>

      {weak && (
        <div className="flex flex-col gap-4">
          <Banner
            status="info"
            title="Your matches are still broad."
            description="Add more tools you have used, even from class projects. The more you add, the sharper your results."
          />
          <div className="flex gap-3">
            <ButtonLink href="/profile/tools">Add more tools</ButtonLink>
            <ButtonLink href="/explore" variant="secondary">
              Explore careers
            </ButtonLink>
          </div>
        </div>
      )}

      <TopMatch match={top} fieldName={fieldName(top.occupation.field)} />

      <section className="flex flex-col gap-6" aria-labelledby="more-heading">
        <div className="flex items-center justify-between">
          <h2 id="more-heading" className="text-h2 font-semibold">
            More matches
          </h2>
          <p className="text-sm text-muted-foreground max-sm:hidden">Sorted by match score</p>
          <Button variant="secondary" size="sm" className="sm:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)}>
            Filters{activeFilters ? ` · ${activeFilters}` : ""}
          </Button>
        </div>
        <div className={cn(!filtersOpen && "max-sm:hidden")}>{filters}</div>

        <p className="sr-only" role="status">
          {filtered.length} careers match these filters
        </p>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No careers match these filters. Try a different field or preparation level.</p>
        ) : (
          <div ref={listRef} className="grid gap-x-6 gap-y-4 lg:grid-cols-2 max-sm:gap-0 max-sm:overflow-hidden max-sm:rounded-card max-sm:border max-sm:border-border max-sm:[&>a]:rounded-none max-sm:[&>a]:border-0 max-sm:[&>a+a]:border-t">
            {filtered.slice(0, shown).map(m => (
              <OccupationCard key={m.occupation.code} match={m} fieldName={fieldName(m.occupation.field)} />
            ))}
          </div>
        )}
        {shown < filtered.length && (
          <Button
            variant="secondary"
            className="self-start max-sm:w-full"
            onClick={() => {
              focusIndex.current = shown;
              setShown(s => s + PAGE);
            }}
          >
            Show 10 more
          </Button>
        )}
      </section>
    </Container>
  );
}
