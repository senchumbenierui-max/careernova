import type { ReactNode } from "react";
import { Link } from "wouter";
import { Container } from "@/components/layout";
import { ButtonLink, linkClass } from "@/components/ui/button";
import { useData } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3.5 sm:flex-row sm:gap-6">
      <dt className="font-medium sm:w-[200px] sm:shrink-0">{label}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-border py-10 lg:flex-row lg:gap-24 lg:py-14">
      <h2 className="text-h2 font-semibold lg:w-[280px] lg:shrink-0">{title}</h2>
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[712px]">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const { occupations } = useData();
  return (
    <Container className="pb-16 pt-10 md:pb-24 md:pt-[72px]">
      <div className="flex flex-col gap-4 pb-12 md:pb-[72px]">
        <h1 className="text-display-2 max-sm:text-display-3">About CareerNova</h1>
        <p className="max-w-[720px] text-lg leading-7 text-muted-foreground max-sm:text-base max-sm:leading-[22px]">
          An explainable career mentoring tool for students. It shows which careers fit what you can already do, why they fit,
          and what to learn next.
        </p>
      </div>

      <Section title="Why it exists">
        <p className="text-muted-foreground">
          Most career-guidance tools rely on short quizzes or keyword matching, look at one part of a student at a time, and
          don't explain their suggestions. CareerNova looks at your tools, core skills, interests and education together, and
          shows the reason behind every number so you can judge the advice yourself.
        </p>
      </Section>

      <Section title="The project">
        <dl className="flex flex-col">
          <Row label="Built by">Senchumbeni C Erui</Row>
          <Row label="Supervisor">Ma'am Salam Ameeta</Row>
          <Row label="Programme">B.Tech Computer Science &amp; Engineering, final-year project</Row>
        </dl>
      </Section>

      <Section title="What's inside">
        <dl className="flex flex-col">
          <Row label="Career data">
            {formatNumber(occupations.length)} occupations from O*NET, with their skills, Job Zones and technologies.
          </Row>
          <Row label="Matching">
            A transparent four-part score: tools, core skills, interests and preparation.{" "}
            <Link href="/how-it-works" className={linkClass}>
              How it works
            </Link>
          </Row>
          <Row label="Machine learning">
            A Random Forest that predicts each career's Job Zone, shown next to O*NET's official zone as a check. Compared with a
            1D-CNN and Logistic Regression; all reach about 70% cross-validated accuracy.
          </Row>
          <Row label="Privacy">
            No accounts. Your profile and CV stay in your browser.{" "}
            <Link href="/privacy" className={linkClass}>
              Privacy
            </Link>
          </Row>
        </dl>
      </Section>

      <Section title="Credits">
        <dl className="flex flex-col">
          <Row label="Data">
            Includes information from O*NET by the U.S. Department of Labor, Employment and Training Administration, used under
            the CC BY 4.0 license. CareerNova has modified some of it (for example, shorter tool names); the Department of
            Labor has not approved, endorsed or tested these changes.
          </Row>
          <Row label="Built with">React, TypeScript, Tailwind CSS, Radix UI, pdf.js and mammoth, with scikit-learn and TensorFlow for the models.</Row>
          <Row label="Typefaces">Figtree and JetBrains Mono, from Google Fonts.</Row>
        </dl>
      </Section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-10">
        <ButtonLink href="/profile">Build my profile</ButtonLink>
        <ButtonLink href="/explore" variant="secondary">
          Explore careers
        </ButtonLink>
      </div>
    </Container>
  );
}
