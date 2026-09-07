import { useEffect, useState } from "react";

const STORAGE_KEY = "lhl_privacy_consent_v1";
const OPEN_EVENT = "lhl:privacy-preferences";
type Consent = "accepted" | "essential";

function startGtm() {
  if (typeof window === "undefined" || document.getElementById("lhl-gtm-script")) return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "lhl-gtm-script";
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-P8X3Z93Q";
  document.head.appendChild(script);
}

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "accepted";
}

export function openPrivacyPreferences() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

export function PrivacyConsent() {
  const [choice, setChoice] = useState<Consent | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Consent | null;
    setChoice(saved);
    if (saved === "accepted") startGtm();
    const open = () => setEditing(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const choose = (value: Consent) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
    setEditing(false);
    if (value === "accepted") {
      startGtm();
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "page_view", page_path: window.location.pathname + window.location.search });
    }
  };

  if (choice && !editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="fixed bottom-3 left-3 z-[90] rounded-full border border-black/10 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg" aria-label="Revisar preferências de privacidade">
        Privacidade
      </button>
    );
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-4 shadow-2xl sm:p-5" aria-label="Preferências de privacidade">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-700">
          Usamos armazenamento essencial para o funcionamento do site. Com sua permissão, também usamos dados de navegação para medir campanhas e melhorar a experiência. Veja nossa <a className="font-semibold underline" href="/privacidade">Política de Privacidade</a>.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => choose("essential")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Somente essenciais</button>
          <button type="button" onClick={() => choose("accepted")} className="rounded-lg bg-[#651421] px-4 py-2 text-sm font-semibold text-white">Aceitar analytics</button>
        </div>
      </div>
    </aside>
  );
}
