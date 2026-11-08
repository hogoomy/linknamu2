"use client";

import { addDays } from "date-fns";
import { useEffect, useState } from "react";
import { eventsOn, todayKey, toKey } from "@/lib/dates";
import type { PlannerEvent, Task } from "@/lib/types";
import { Calendar } from "./Calendar";
import { DaySheet } from "./DayPanel";
import { Editor, type EditorTarget } from "./Editor";
import { GoogleProvider, useGoogle } from "./GoogleProvider";
import { CoupleSetup, SignIn } from "./Onboarding";
import { PlannerProvider, usePlanner } from "./PlannerProvider";
import { Settings } from "./Settings";
import { TasksView } from "./TasksView";
import { Icon } from "./ui";

type Tab = "calendar" | "tasks" | "settings";

export function App() {
  return (
    <PlannerProvider>
      <GoogleProvider>
        <ServiceWorker />
        <Gate />
        <Toast />
      </GoogleProvider>
    </PlannerProvider>
  );
}

function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    }
  }, []);
  return null;
}

function Toast() {
  const { toast } = usePlanner();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4 lg:bottom-8">
      {toast && <div className="animate-sheet rounded-[14px] bg-[#333d4b] px-5 py-3 text-[15px] font-medium text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function Gate() {
  const { status, error, me, refresh } = usePlanner();
  if (status === "loading")
    return (
      <div className="grid min-h-dvh place-items-center text-ink-3" aria-busy>
        불러오는 중…
      </div>
    );
  if (status === "error")
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-[18px] font-bold">불러오지 못했어요</p>
          <p className="mt-1 text-[15px] text-ink-2">{error}</p>
          <button onClick={() => refresh()} className="mt-4 rounded-[12px] bg-accent px-5 py-2.5 font-semibold text-accent-ink">
            다시 시도
          </button>
        </div>
      </div>
    );
  if (!me) return <SignIn />;
  if (!me.couple_id) return <CoupleSetup />;
  return <Main />;
}

/** 달력 아래 요약: 오늘 내 할 일 · 새 부탁 · 7일 일정 */
function Summary() {
  const { me, tasks, events } = usePlanner();
  const google = useGoogle();
  const today = todayKey();
  const todayTasks = tasks.filter((t) => t.status !== "done" && t.due_date === today && (t.assignee_id === me?.id || t.assignee_id === null)).length;
  const received = tasks.filter((t) => t.status === "requested" && t.assignee_id === me?.id && t.requester_id !== me?.id).length;
  const weekEvents = Array.from({ length: 7 }, (_, i) => toKey(addDays(new Date(), i))).reduce(
    (n, k) => n + eventsOn(events, k).length + eventsOn(google.events, k).length,
    0,
  );
  return (
    <section className="flex gap-2 rounded-[24px] bg-surface p-3" aria-label="요약">
      <Stat label="오늘 내 할 일" value={todayTasks} />
      <Stat label="새 부탁" value={received} highlight={received > 0} />
      <Stat label="7일 일정" value={weekEvents} />
    </section>
  );
}

function Stat({ label, value, highlight, glass }: { label: string; value: number; highlight?: boolean; glass?: boolean }) {
  return (
    <div className={`flex-1 rounded-[14px] px-3 py-2.5 ${glass ? "bg-white/15 backdrop-blur-md" : highlight ? "bg-accent-soft" : "bg-surface-2"}`}>
      <p className={`text-[12px] font-medium ${glass ? "text-white/80" : highlight ? "text-accent" : "text-ink-3"}`}>{label}</p>
      <p className={`text-[20px] font-bold tabular-nums ${glass ? "text-white" : highlight ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function Main() {
  const { me, backend } = usePlanner();
  const [tab, setTab] = useState<Tab>("calendar");
  const [day, setDay] = useState(todayKey());
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [dayOpen, setDayOpen] = useState(false);

  const openEvent = (item: PlannerEvent) => setEditor({ kind: "event", date: item.date, item });
  const openTask = (item: Task) => setEditor({ kind: "task", date: item.due_date, item });
  const add = (kind: "event" | "task", date: string | null = day) => setEditor(kind === "event" ? { kind, date: date ?? day } : { kind, date });

  const nav: { id: Tab; label: string; icon: "calendar" | "check" | "settings" }[] = [
    { id: "calendar", label: "홈", icon: "calendar" },
    { id: "tasks", label: "할 일", icon: "check" },
    { id: "settings", label: "설정", icon: "settings" },
  ];
  const titles: Record<Tab, string> = { calendar: "우리집", tasks: "할 일", settings: "설정" };

  return (
    <div className="mx-auto min-h-dvh max-w-6xl lg:px-6">
      <header className="pt-safe sticky top-0 z-30 bg-bg/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-5 pt-3 pb-3 lg:px-0">
          <h1 className="text-[26px] font-bold tracking-tight">{titles[tab]}</h1>
          {backend.mode === "demo" && <span className="rounded-[6px] bg-accent-soft px-1.5 py-0.5 text-[12px] font-semibold text-accent">체험판</span>}
          <nav className="ml-auto hidden gap-1 lg:flex">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                aria-current={tab === n.id}
                className={`flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[15px] font-semibold ${tab === n.id ? "bg-surface text-ink" : "text-ink-3 hover:bg-surface"}`}
              >
                <Icon name={n.icon} className="size-4" />
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="px-4 pb-32 lg:px-0 lg:pb-12">
        {tab === "calendar" && (
          <div className="mx-auto max-w-2xl space-y-3">
            <Calendar
              selected={day}
              onSelect={setDay}
              onPick={(k) => {
                setDay(k);
                setDayOpen(true);
              }}
            />
            <Summary />
          </div>
        )}
        {tab === "tasks" && (
          <div className="mx-auto max-w-2xl">
            <TasksView onOpenTask={openTask} />
          </div>
        )}
        {tab === "settings" && (
          <div className="mx-auto max-w-xl">
            <Settings key={me!.id} />
          </div>
        )}
      </main>

      {/* 할 일 탭에만 떠 있는 추가 버튼 (홈은 날짜 카드의 버튼 사용) */}
      {tab === "tasks" && (
        <button
          onClick={() => add("task", null)}
          className="fixed right-5 bottom-28 z-40 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/30 transition active:scale-95 lg:right-10 lg:bottom-10"
          aria-label="새로 추가"
        >
          <Icon name="plus" className="size-7" />
        </button>
      )}

      {/* 모바일: 하단 탭바 */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 rounded-t-[20px] bg-surface shadow-[0_-1px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="mx-auto flex max-w-md">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              aria-current={tab === n.id}
              className={`flex min-h-[68px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${tab === n.id ? "text-ink" : "text-ink-3/70"}`}
            >
              <Icon name={n.icon} className="size-6" />
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      <DaySheet day={day} open={dayOpen && tab === "calendar"} onClose={() => setDayOpen(false)} onAdd={(k) => add(k)} onOpenEvent={openEvent} onOpenTask={openTask} />
      <Editor target={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
