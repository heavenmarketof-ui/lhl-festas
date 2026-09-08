import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

/** Fade/slide reveal on viewport entry. Respects prefers-reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  tone = "default",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted";
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24",
        tone === "muted" && "bg-muted/50",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
      {children}
    </p>
  );
}

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-2xl font-semibold leading-tight tracking-tight sm:text-4xl", className)}>
      {children}
    </h2>
  );
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg", className)}>
      {children}
    </p>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-[var(--heaven-shadow)] sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Reusable screenshot slot.
 *
 * Pass `src` once a REAL screenshot of the platform is available.
 * While `src` is empty an elegant placeholder is rendered and `note`
 * documents which screen must be captured.
 */
export function Screenshot({
  src,
  alt,
  title,
  description,
  highlights,
  device = "desktop",
  note,
}: {
  src?: string;
  alt: string;
  title?: string;
  description?: string;
  highlights?: string[];
  device?: "desktop" | "mobile";
  note?: string;
}) {
  const isMobile = device === "mobile";
  return (
    <figure className="w-full">
      <div
        className={cn(
          "mx-auto overflow-hidden border border-border bg-card shadow-[var(--heaven-shadow-lg)]",
          isMobile ? "max-w-[300px] rounded-[2rem] p-2" : "rounded-2xl p-2",
        )}
      >
        <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
        </div>
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            width={isMobile ? 300 : 1280}
            height={isMobile ? 620 : 800}
            className={cn(
              "w-full bg-muted object-cover object-top",
              isMobile ? "rounded-[1.5rem] aspect-[9/19]" : "rounded-xl",
            )}
          />
        ) : (
          <div
            role="img"
            aria-label={alt}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 bg-muted text-center",
              isMobile ? "rounded-[1.5rem] aspect-[9/19]" : "rounded-xl aspect-[16/10]",
            )}
          >
            <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="px-6 text-sm font-medium text-muted-foreground">
              Screenshot da plataforma
            </span>
            {note ? (
              <span className="max-w-[80%] text-xs text-muted-foreground/80">{note}</span>
            ) : null}
          </div>
        )}
      </div>
      {(title || description || highlights?.length) && (
        <figcaption className="mx-auto mt-5 max-w-2xl text-center">
          {title ? <p className="font-semibold">{title}</p> : null}
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {highlights?.length ? (
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {highlights.map((h) => (
                <li
                  key={h}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground/80"
                >
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
        </figcaption>
      )}
    </figure>
  );
}

/** Vertical/stacked flow with progressive reveal. */
export function Flow({ steps }: { steps: (string | string[])[] }) {
  return (
    <ol className="mx-auto flex max-w-md flex-col items-stretch gap-2">
      {steps.map((step, i) => (
        <li key={Array.isArray(step) ? step.join("-") : step}>
          <Reveal delay={i * 70}>
            {Array.isArray(step) ? (
              <div className="grid grid-cols-2 gap-2">
                {step.map((s) => (
                  <div
                    key={s}
                    className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm font-medium"
                  >
                    {s}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium shadow-[var(--heaven-shadow)]">
                {step}
              </div>
            )}
            {i < steps.length - 1 ? (
              <div className="mx-auto h-4 w-px bg-border" aria-hidden="true" />
            ) : null}
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

