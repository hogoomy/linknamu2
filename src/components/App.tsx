"use client";

import { useEffect, useState } from "react";
import { todayKey } from "@/lib/dates";
import type { PlannerEvent, Task } from "@/lib/types";
import { Calendar, type CalView } from "./Calendar";
import { DayPanel } from "./DayPanel";
import { Editor, type EditorTarget } from "./Editor";
import { CoupleSetup, SignIn } from "./Onboarding";
import { PlannerProvider, usePlanner } from "./PlannerProvider";
import { Settings } from "./Settings";
import { TasksView } from "./TasksView";
import { Icon } from "./ui";

type Tab = "calendar" | "tasks" | "settings";

export function App() {
  return (
    <PlannerProvider>
      <ServiceWorker />
      <Gate />
      <Toast />
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
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8">
      {toast && <div className="animate-sheet rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-lg">{toast}</div>}
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
          <p className="font-bold">불러오지 못했어요</p>
          <p className="mt-1 text-sm text-ink-2">{error}</p>
          <button onClick={() => refresh()} className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-bold text-bg">
            다시 시도
          </button>
        </div>
      </div>
    );
  if (!me) return <SignIn />;
  if (!me.couple_id) return <CoupleSetup />;
  return <Main />;
}

function Main() {
  const { me, partner, backend } = usePlanner();
  const [tab, setTab] = useState<Tab>("calendar");
  const [day, setDay] = useState(todayKey());
  const [view, setView] = useState<CalView>("month");
  const [editor, setEditor] = useState<EditorTarget | null>(null);

  const openEvent = (item: PlannerEvent) => setEditor({ kind: "event", date: item.date, item });
  const openTask = (item: Task) => setEditor({ kind: "task", date: item.due_date, item });
  const add = (kind: "event" | "task", date: string | null = day) =>
    setEditor(kind === "event" ? { kind, date: date ?? day } : { kind, date });

  const dayPanel = <DayPanel day={day} onAdd={(k) => add(k)} onOpenEvent={openEvent} onOpenTask={openTask} />;

  const nav: { id: Tab; label: string; icon: "calendar" | "check" | "settings" }[] = [
    { id: "calendar", label: "달력", icon: "calendar" },
    { id: "tasks", label: "할 일", icon: "check" },
    { id: "settings", label: "설정", icon: "settings" },
  ];

  return (
    <div className="mx-auto min-h-dvh max-w-6xl lg:px-6">
      <header className="pt-safe sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-0">
          <div className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink">
            <Icon name="heart" className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">우리집 플래너</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-3">
              <Dot color={me!.color} /> {me!.name}
              {partner && (
                <>
                  <span>&</span>
                  <Dot color={partner.color} /> {partner.name}
                </>
              )}
              {backend.mode === "demo" && <span className="ml-1 rounded bg-surface-2 px-1.5 font-semibold">데모</span>}
            </p>
          </div>
          {/* PC: 상단 탭 */}
          <nav className="ml-auto hidden gap-1 lg:flex">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                aria-current={tab === n.id}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${tab === n.id ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"}`}
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
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            <div className="pt-1">
              <Calendar selected={day} onSelect={setDay} view={view} onViewChange={setView} />
            </div>
            <div className="mt-6 lg:mt-1">{dayPanel}</div>
          </div>
        )}
        {tab === "tasks" && (
          <div className="mx-auto max-w-2xl pt-1">
            <TasksView onOpenTask={openTask} />
          </div>
        )}
        {tab === "settings" && (
          <div className="mx-auto max-w-xl pt-1">
            <Settings key={me!.id} />
          </div>
        )}
      </main>

      {/* 달력 탭은 날짜 패널의 '+ 일정 / + 할 일' 버튼을 쓰고, 할 일 탭에만 떠 있는 추가 버튼 */}
      {tab === "tasks" && (
        <button
          onClick={() => add("task", null)}
          className="fixed right-5 bottom-24 z-40 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-xl shadow-accent/30 lg:bottom-10 lg:right-10"
          aria-label="새로 추가"
        >
          <Icon name="plus" className="size-7" />
        </button>
      )}

      {/* 모바일: 하단 탭바 */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              aria-current={tab === n.id}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${tab === n.id ? "text-accent" : "text-ink-3"}`}
            >
              <Icon name={n.icon} className="size-6" />
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      <Editor target={editor} onClose={() => setEditor(null)} />
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block size-2 rounded-full" style={{ background: color }} />;
}
