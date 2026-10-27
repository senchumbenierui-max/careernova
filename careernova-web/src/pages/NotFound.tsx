import { Container } from "@/components/layout";
import { ButtonLink } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <Container className="flex flex-col gap-7 py-16 md:py-24">
      <span className="font-mono text-subtle">404</span>
      <h1 className="text-display-3">This page doesn't exist</h1>
      <p className="text-muted-foreground">The link may be old, or a career code may have a typo.</p>
      <div className="flex gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/explore" variant="secondary">
          Explore careers
        </ButtonLink>
      </div>
    </Container>
  );
}
