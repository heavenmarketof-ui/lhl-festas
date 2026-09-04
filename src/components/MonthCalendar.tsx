import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateBR, toDateISO } from "@/lib/date-utils";
import type { StoredOrder } from "@/lib/orders-storage";
import { 
  orderCalendarLevel, 
  PriorityDot, 
  CalendarLegend 
} from "@/components/admin-shell";
import type { OrdemProducao } from "@/lib/producao-api";
import { 
  isAtrasada, 
  pendenciasDaOP, 
  progressPercent, 
  conferenciaCompleta 
} from "@/lib/producao-api";

interface MonthCalendarProps {
  cursor: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  eventsByDay: Map<string, StoredOrder[]>;
  onOpen: (id: string) => void;
  todayISO?: string;
  in7ISO?: string;
  ordens?: OrdemProducao[];
}

export function MonthCalendar({
  cursor,
  onPrev,
  onNext,
  onToday,
  eventsByDay,
  onOpen,
  todayISO,
  in7ISO,
  ordens = [],
}: MonthCalendarProps) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const computedTodayISO =
    todayISO ??
    (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ iso, day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const opDe = (contratoId: string) => ordens.find((x) => x && x.contratoId === contratoId);

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-primary flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gold" /> Agenda
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-[11px]"
            onClick={onToday}
          >
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-serif text-lg text-primary capitalize min-w-[140px] text-center">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {weekdays.map((w) => (
          <div key={w} className="text-center py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="min-h-[70px] rounded-lg bg-background/30" />;
          const events = eventsByDay.get(c.iso) ?? [];
          const isToday = c.iso === computedTodayISO;
          return (
            <div
              key={i}
              className={`min-h-[70px] rounded-lg border p-1.5 flex flex-col gap-1 ${
                isToday ? "border-primary bg-primary/5" : "border-border/60 bg-background/50"
              } ${events.length > 0 ? "ring-1 ring-gold/40" : ""}`}
            >
              <div
                className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}
              >
                {c.day}
              </div>
              <div className="flex flex-col gap-0.5">
                {events.slice(0, 3).map((o) => {
                  if (!o) return null;
                  const opAtual = opDe(o.id);
                  const level = orderCalendarLevel(
                    o,
                    computedTodayISO,
                    in7ISO ?? computedTodayISO,
                    opAtual,
                  );
                  const nomeExib = o.details?.nomeAniversariante || o.nome || "—";
                  const kitPronto = opAtual ? conferenciaCompleta(opAtual) : false;
                  
                  return (
                    <button
                      key={o.id}
                      onClick={() => onOpen(o.id)}
                      className={`flex items-center gap-1 hover:opacity-70 transition-opacity`}
                    >
                      <PriorityDot level={level} />
                      <span className="text-[9px] font-medium truncate text-foreground max-w-[40px] sm:max-w-none">
                        {nomeExib}
                      </span>
                    </button>
                  );
                })}
                {events.length > 3 && (
                  <div className="text-[8px] text-muted-foreground pl-3">
                    +{events.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <CalendarLegend />
    </section>
  );
}
