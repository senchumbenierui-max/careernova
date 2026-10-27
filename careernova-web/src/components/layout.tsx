import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { STORAGE_KEYS } from "@/lib/constants";
import { useDataState } from "@/lib/data";
import { hasResults, useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { ChatLauncher } from "./chat/launcher";
import { Button, buttonClass } from "./ui/button";
import { EmptyState, Skeleton } from "./ui/feedback";

type Theme = "light" | "dark" | "system";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEYS.theme);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      // ignore
    }
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const next: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-7 px-0"
      onClick={() => setTheme(next[theme])}
      aria-label={`Theme: ${theme}. Switch to ${next[theme]}`}
      title={`Theme: ${theme}`}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-sm text-lg font-semibold">
      <span className="size-2.5 rounded-full bg-score" aria-hidden />
      CareerNova
    </Link>
  );
}

function useNavLinks() {
  const profile = useProfile();
  return [
    { href: "/explore", label: "Explore" },
    { href: "/how-it-works", label: "How it works" },
    ...(hasResults(profile) ? [{ href: "/results", label: "My results" }] : []),
  ];
}

function MobileMenu() {
  const links = useNavLinks();
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  useEffect(() => setOpen(false), [location]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={buttonClass("ghost", "sm", "size-7 px-0")} aria-label="Open menu">
        <Menu className="size-4" aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background px-5 pb-6 pt-4">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Menu</Dialog.Title>
            <Dialog.Close className={buttonClass("ghost", "sm", "size-7 px-0")} aria-label="Close menu">
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
          <nav className="mt-4 flex flex-col">
            {[{ href: "/", label: "Home" }, ...links, { href: "/profile", label: "Build my profile" }].map(l => (
              <Link key={l.href} href={l.href} className="border-b border-border py-3 text-lg">
                {l.label}
              </Link>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Nav() {
  const links = useNavLinks();
  const [location] = useLocation();
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-4 md:px-10 md:py-5 xl:px-24">
        <Logo />
        <nav className="flex items-center gap-1 max-md:hidden" aria-label="Main">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={location === l.href ? "page" : undefined}
              className={buttonClass("ghost", "sm", location === l.href ? "bg-neutral" : undefined)}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pb-16 pt-12 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between md:px-10 xl:px-24">
        <div className="flex max-w-[560px] flex-col gap-1.5">
          <p>B.Tech CSE project by Senchumbeni C Erui · Supervisor: Ma'am Salam Ameeta</p>
          <p>Includes information from O*NET by the U.S. Department of Labor.</p>
        </div>
        <nav className="flex gap-5 text-base text-primary" aria-label="Footer">
          <Link href="/how-it-works" className="hover:underline">
            How it works
          </Link>
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

/** Shows loading and error states until the dataset is ready. */
function DataGate({ children }: { children: ReactNode }) {
  const state = useDataState();
  if (state.status === "ready") return <>{children}</>;
  if (state.status === "error") {
    return (
      <Container className="py-16">
        <EmptyState
          title="We couldn't load the career data"
          description="Check your connection and try again. Your profile is safe on this device."
        >
          <Button onClick={state.retry}>Try again</Button>
        </EmptyState>
      </Container>
    );
  }
  return (
    <Container className="flex flex-col gap-6 py-16" aria-busy="true">
      <span className="sr-only" role="status">
        Loading
      </span>
      <Skeleton className="h-9 w-2/3 max-w-[480px]" />
      <Skeleton className="h-5 w-1/2 max-w-[360px]" />
      <Skeleton className="h-64 w-full rounded-card" />
    </Container>
  );
}

export function Container({ className, children, ...rest }: { className?: string; children: ReactNode; "aria-busy"?: "true" }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-5 md:px-10 xl:px-24", className)} {...rest}>
      {children}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [location]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-element focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main" className="flex-1">
        <DataGate>{children}</DataGate>
      </main>
      <Footer />
      <ChatLauncher />
    </div>
  );
}
