import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import { AppLayout, Container } from "./components/layout";
import { TooltipProvider } from "./components/ui/controls";
import { Skeleton } from "./components/ui/feedback";
import { DataProvider } from "./lib/data";
import LandingPage from "./pages/Landing";
import NotFoundPage from "./pages/NotFound";

// Pages load on first visit, so the landing page stays light on slow phones
const ProfilePage = lazy(() => import("./pages/Profile"));
const ResultsPage = lazy(() => import("./pages/Results"));
const CareerPage = lazy(() => import("./pages/Career"));
const ExplorePage = lazy(() => import("./pages/Explore"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorks"));
const PrivacyPage = lazy(() => import("./pages/Privacy"));
const AboutPage = lazy(() => import("./pages/About"));

function PageFallback() {
  return (
    <Container className="flex flex-col gap-6 py-16" aria-busy="true">
      <Skeleton className="h-9 w-2/3 max-w-[480px]" />
      <Skeleton className="h-5 w-1/2 max-w-[360px]" />
    </Container>
  );
}

export default function App() {
  return (
    <DataProvider>
      <TooltipProvider>
        <AppLayout>
          <Suspense fallback={<PageFallback />}>
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/profile/:step" component={ProfilePage} />
              <Route path="/results" component={ResultsPage} />
              <Route path="/career/:code" component={CareerPage} />
              <Route path="/explore" component={ExplorePage} />
              <Route path="/how-it-works" component={HowItWorksPage} />
              <Route path="/about" component={AboutPage} />
              <Route path="/privacy" component={PrivacyPage} />
              <Route component={NotFoundPage} />
            </Switch>
          </Suspense>
        </AppLayout>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: "!bg-inverted !text-on-inverted !border-0 !rounded-card !font-sans !text-base",
          }}
        />
      </TooltipProvider>
    </DataProvider>
  );
}
