import { useState } from "react";
import { Container } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/constants";
import { useProfile } from "@/lib/profile";

export default function PrivacyPage() {
  const profile = useProfile();
  const [cleared, setCleared] = useState(false);

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEYS.profile);
      localStorage.removeItem(STORAGE_KEYS.results);
      localStorage.removeItem(STORAGE_KEYS.chat);
      sessionStorage.removeItem(STORAGE_KEYS.chatHistory);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("careernova:profile"));
    setCleared(true);
  }

  return (
    <Container className="flex max-w-[720px] flex-col gap-6 py-12 md:box-content md:py-[72px]">
      <h1 className="text-display-3">Privacy</h1>
      <p className="text-lg leading-7 text-muted-foreground">
        CareerNova has no accounts and no server-side storage. Everything you enter stays in this browser, unless you
        use the chat assistant.
      </p>
      <dl className="flex flex-col">
        {[
          ["Your profile", "Saved in this browser's local storage so you can come back to it. It is never sent anywhere."],
          ["Your CV", "Read inside your browser to find tools, then discarded. The file is never uploaded or stored."],
          ["Matching", "Runs on your device using a copy of the O*NET data."],
          ["Course links", "Open search pages on Coursera, freeCodeCamp or YouTube. Those sites have their own privacy policies."],
          [
            "Chat assistant",
            "Only when you use it. Your question and the CareerNova data that matches it are sent through our server to Groq, an AI service, which writes the answer. Groq's own privacy policy applies. Our server doesn't store or log your chat, and the conversation is kept in this browser tab only.",
          ],
          [
            "Profile in chat",
            "Off unless you tick “Use my profile for personal answers”. Then a summary is sent with each question: education, branch, tools, skill ratings, interests and your top matches. Never your name or your CV.",
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:gap-6">
            <dt className="font-medium sm:w-[160px] sm:shrink-0">{k}</dt>
            <dd className="text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      {profile && !cleared ? (
        <Button variant="secondary" className="self-start" onClick={clear}>
          Delete my profile and chat from this device
        </Button>
      ) : cleared ? (
        <p role="status" className="text-muted-foreground">
          Your profile and chat have been deleted from this device.
        </p>
      ) : null}
    </Container>
  );
}
