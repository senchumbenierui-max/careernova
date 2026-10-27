import type { ReactNode } from "react";
import { Link } from "wouter";
import { Container } from "@/components/layout";
import { linkClass } from "@/components/ui/button";
import { MODEL_RESULTS, WEIGHTS } from "@/lib/constants";
import { useData } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const FEATURE_LABELS: Record<string, string> = {
  avg_essential_importance: "Avg essential-skill importance",
  software_skill_count: "Software skill count",
  max_essential_importance: "Max essential-skill importance",
  hot_technology_count: "Hot technology count",
  in_demand_software_count: "In-demand software count",
  essential_skill_count: "Essential skill count",
  has_essential_skills: "Has essential skills",
  data_completeness_pct: "Data completeness",
};

function Block({ n, title, id, children }: { n: string; title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-6 border-t border-border py-10 lg:flex-row lg:gap-24 lg:py-14" aria-labelledby={`s${n}`}>
      <div className="flex flex-col gap-1.5 lg:w-[280px] lg:shrink-0">
        <span className="font-mono text-subtle">{n}</span>
        <h2 id={`s${n}`} className="text-h2 font-semibold">
          {title}
        </h2>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-[712px]">{children}</div>
    </section>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-lg leading-7 text-muted-foreground max-sm:text-base max-sm:leading-[22px]">{children}</p>;
}

function Rows({ rows, labelWidth = "sm:w-[140px]" }: { rows: [string, string][]; labelWidth?: string }) {
  return (
    <dl className="flex flex-col">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:gap-6">
          <dt className={`font-medium sm:shrink-0 ${labelWidth}`}>{k}</dt>
          <dd className="text-muted-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-border bg-card p-5">
      <p className="font-bold">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  const { occupations, stats, model } = useData();
  const unrated = occupations.filter(o => !o.zone).length;
  const { zones, matrix } = model.confusion;
  const maxCell = Math.max(...matrix.flat());
  const topFeatures = model.featureImportance.slice(0, 5);
  const maxImportance = topFeatures[0]?.importance ?? 1;

  return (
    <Container className="pb-16 pt-10 md:pb-24 md:pt-[72px]">
      <div className="flex flex-col gap-4 pb-12 md:pb-[72px]">
        <h1 className="text-display-2 max-sm:text-display-3">How CareerNova works</h1>
        <p className="max-w-[720px] text-lg leading-7 text-muted-foreground max-sm:text-base max-sm:leading-[22px]">
          Written for students and for the examiners who will check it. Every number on CareerNova can be traced back to the
          data and the rules on this page.
        </p>
      </div>

      <Block n="01" title="The data">
        <Lead>
          CareerNova uses the O*NET database from the U.S. Department of Labor: {formatNumber(occupations.length)} occupations,
          each with a description, a Job Zone, the importance and level of 10 core skills, in-demand software and hot
          technologies.
        </Lead>
        <dl className="flex flex-col">
          {[
            ["Occupations", formatNumber(occupations.length)],
            ["Core skills compared", "10, the same for every occupation"],
            ["In-demand software", `${stats.inDemandUnique} unique tools`],
            ["Hot technologies", `${stats.hotUnique} unique`],
            ["Job Zone missing", `${unrated} occupations, shown as "Not rated"`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border py-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <Note title="A note on U.S. data">
          Occupations and tools translate well to India. Local job titles and degree paths may differ, so read a match as
          "this kind of work", not a specific job posting.
        </Note>
      </Block>

      <Block n="02" title="The matching method">
        <Lead>
          Your profile is compared with each occupation in four parts. The parts add up to a match score from 0 to 100. It
          shows overlap, not a probability.
        </Lead>
        <div className="flex gap-1" role="img" aria-label="Score weights: tools 40, core skills 30, interest 15, preparation 15 points">
          {[
            ["Tools", WEIGHTS.tools, "bg-score"],
            ["Core skills", WEIGHTS.skills, "bg-missing-fg dark:bg-[#3d7fd1]"],
            ["Interest", WEIGHTS.interest, "bg-missing-bg"],
            ["Preparation", WEIGHTS.prep, "bg-missing-bg"],
          ].map(([label, weight, color]) => (
            <div key={label} className="flex min-w-0 flex-col gap-2.5" style={{ flex: `${weight} 0 0` }}>
              <div className={`h-3 rounded-[3px] ${color}`} />
              <span className="truncate font-medium max-sm:text-sm">{label}</span>
              <span className="text-sm text-muted-foreground">{weight} points</span>
            </div>
          ))}
        </div>
        <Rows
          rows={[
            ["Tools", "Your tools vs the occupation's in-demand and hot technologies. In-demand tools count fully, hot technologies half. Full marks need about 40% of the career's list: at least 5 tools, at most 15, so a career that lists only one or two tools can't give full marks."],
            ["Core skills", "Your 10 self-ratings vs the levels the occupation needs, weighted by how important each skill is for the job."],
            ["Interest", "Whether the occupation is in a field you chose."],
            ["Preparation", "Your education level vs the Job Zone. Full points at your level, fewer one zone above it or far below it. Where O*NET has not rated a career, the model's predicted zone is used and labelled."],
          ]}
        />
        <p className="text-muted-foreground">
          Missing tools are ranked: in-demand first, then hot technologies, each ordered by how many occupations use them.
          Parts with no O*NET data count as half marks, so missing data never pushes a career up or down.
        </p>
      </Block>

      <Block n="03" title="The trained model">
        <Lead>
          A classifier predicts an occupation's Job Zone (2 to 5) from its skill and technology profile. On each career page
          its prediction is shown next to O*NET's official zone, as a check.
        </Lead>
        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[420px] text-left">
            <thead className="text-sm text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-normal">Model</th>
                <th className="py-3.5 pr-5 font-normal">CV accuracy</th>
                <th className="py-3.5 pr-5 font-normal">Macro F1</th>
              </tr>
            </thead>
            <tbody>
              {MODEL_RESULTS.map(r => (
                <tr key={r.model} className="border-t border-border">
                  <td className={`px-5 py-3.5 ${r.best ? "font-semibold" : "font-medium"}`}>{r.model}</td>
                  <td className="py-3.5 pr-5">{r.accuracy}</td>
                  <td className="py-3.5 pr-5">{r.f1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground">
          Held-out test accuracy: 64.9% to 66.0% across the three models. The three are within the cross-validation spread of
          each other. Career pages use the Random Forest, with 5-fold cross-validated predictions, so no career's prediction
          comes from a model that saw it. It agrees with O*NET on {Math.round(model.outOfFoldAccuracy * 1000) / 10}% of rated
          careers.
        </p>

        <div className="flex flex-col gap-3">
          <h3 className="font-bold">
            Confusion matrix, Random Forest, test set ({model.testSize} careers)
          </h3>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <td className="w-24" />
                  {zones.map(z => (
                    <th key={z} scope="col" className="w-[72px] text-center text-sm font-normal text-muted-foreground">
                      Pred {z}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={zones[i]}>
                    <th scope="row" className="pr-2 text-left text-sm font-normal text-muted-foreground">
                      Actual {zones[i]}
                    </th>
                    {row.map((n, j) => {
                      const strength = n / maxCell;
                      return (
                        <td
                          key={j}
                          className="h-12 rounded-inner border border-border text-center font-mono"
                          style={{
                            background: `color-mix(in srgb, var(--score) ${Math.round(strength * 75)}%, var(--card))`,
                            color: strength > 0.55 ? "#ffffff" : undefined,
                          }}
                        >
                          {n}
                          {i === j && <span className="sr-only"> (correct)</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-[600px] text-sm text-muted-foreground">
            Rows are O*NET's zone, columns are the prediction; the diagonal is correct. Darker shading means more careers; each
            cell also prints its number. Test accuracy {(model.testAccuracy * 100).toFixed(1)}%.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-bold">What the model relies on (feature importance)</h3>
          <dl className="flex flex-col gap-3">
            {topFeatures.map(f => (
              <div key={f.feature} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[260px_minmax(0,360px)_auto]">
                <dt>{FEATURE_LABELS[f.feature] ?? f.feature}</dt>
                <dd className="order-3 col-span-2 h-2 overflow-hidden rounded bg-track sm:order-none sm:col-span-1" aria-hidden>
                  <div className="h-full rounded bg-score" style={{ width: `${(f.importance / maxImportance) * 100}%` }} />
                </dd>
                <dd className="font-mono">{f.importance.toFixed(2)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Note title="What we fixed">
          Our first model reported 97.8% accuracy. That was too good to be true: the answer had leaked into its inputs. After
          removing the leak, accuracy is about 70%, which is the honest figure above.
        </Note>
      </Block>

      <Block n="04" title="Limitations">
        <Rows
          labelWidth="sm:w-[200px]"
          rows={[
            ["U.S. data", "Occupations come from the U.S.; local job titles may differ."],
            ["Self-reported skills", "Your ratings are your own view. Rating honestly gives better gaps."],
            ["No salary or demand data", "O*NET does not include them here, so CareerNova does not show them."],
            ["Guidance, not a verdict", "The plan suggests a next step. It cannot promise a job."],
          ]}
        />
      </Block>

      <Block n="05" title="Project" id="project">
        <p>
          B.Tech Computer Science and Engineering final-year project by Senchumbeni C Erui. Supervisor: Ma'am Salam Ameeta.
        </p>
        <p className="text-muted-foreground">Includes information from O*NET by the U.S. Department of Labor.</p>
        <Link href="/about" className={`${linkClass} self-start`}>
          More about the project
        </Link>
      </Block>
    </Container>
  );
}
