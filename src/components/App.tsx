"use client";

import { addDays } from "date-fns";
import { useEffect, useState } from "react";
import { dayCount, MET_EMOJI, nextAnniv, WED_EMOJI } from "@/lib/anniv";
import { eventsOn, todayKey, toKey } from "@/lib/dates";
import type { PlannerEvent, Task } from "@/lib/types";
import { Calendar, type CalView } from "./Calendar";
import { DayPanel } from "./DayPanel";
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

/** 홈 맨 위 커버 사진 카드 */
function CoverHero({ onAddPhoto }: { onAddPhoto: () => void }) {
  const { me, partner, cover, tasks, events, met_on, married_on } = usePlanner();
  const google = useGoogle();
  const today = todayKey();
  const todayTasks = tasks.filter((t) => t.status !== "done" && t.due_date === today && (t.assignee_id === me?.id || t.assignee_id === null)).length;
  const received = tasks.filter((t) => t.status === "requested" && t.assignee_id === me?.id && t.requester_id !== me?.id).length;
  const weekEvents = Array.from({ length: 7 }, (_, i) => toKey(addDays(new Date(), i))).reduce(
    (n, k) => n + eventsOn(events, k).length + eventsOn(google.events, k).length,
    0,
  );

  const ddays = [
    met_on && { emoji: MET_EMOJI, label: "처음 만난 날", n: dayCount(met_on, today) },
    married_on && { emoji: WED_EMOJI, label: "결혼", n: dayCount(married_on, today) },
  ].filter((d): d is { emoji: string; label: string; n: number } => !!d && d.n > 0);
  const next = nextAnniv(today, { met_on, married_on });

  const ddayChips = (glass: boolean) =>
    ddays.length > 0 && (
      <div className={`flex gap-1.5 ${glass ? "flex-col items-end" : "flex-wrap"}`}>
        {ddays.map((d) => (
          <span
            key={d.label}
            title={`${d.label}부터 ${d.n.toLocaleString()}일째`}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums ${glass ? "bg-black/40 text-white backdrop-blur-md" : "bg-surface-2"}`}
          >
            <span aria-label={d.label}>{d.emoji}</span> D+{d.n.toLocaleString()}
          </span>
        ))}
      </div>
    );
  const nextLine = next && (
    <>
      {next.emoji} {next.label}{next.dday === 0 ? " · 오늘이에요!" : `까지 D-${next.dday}`}
    </>
  );

  const summary = (
    <div className="flex gap-2">
      <Stat label="오늘 내 할 일" value={todayTasks} />
      <Stat label="새 부탁" value={received} highlight={received > 0} />
      <Stat label="7일 일정" value={weekEvents} />
    </div>
  );

  if (!cover) {
    return (
      <section className="rounded-[24px] bg-surface p-5">
        <p className="text-[22px] leading-tight font-bold tracking-tight">
          {me?.name}
          {partner && <span className="text-ink-3"> & </span>}
          {partner?.name}
        </p>
        {nextLine && <p className="mt-1 text-[14px] font-medium text-ink-2">{nextLine}</p>}
        <div className="mt-2">{ddayChips(false)}</div>
        <button onClick={onAddPhoto} className="mt-2 flex items-center gap-1 text-[15px] font-medium text-accent">
          <Icon name="camera" className="size-4" /> 우리 사진 올리기
        </button>
        <div className="mt-4">{summary}</div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt={`${me?.name}와 ${partner?.name ?? ""}`} className="h-[230px] w-full object-cover object-[50%_18%] sm:h-[280px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden />
      <div className="absolute top-3 right-3 flex flex-col items-end">{ddayChips(true)}</div>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-[24px] leading-tight font-bold tracking-tight drop-shadow">
          {me?.name}
          {partner && <span className="opacity-70"> ♥ </span>}
          {partner?.name}
        </p>
        {nextLine && <p className="mt-1 text-[14px] font-medium text-white/85 drop-shadow">{nextLine}</p>}
        <div className="mt-3 flex gap-2">
          <Stat glass label="오늘 내 할 일" value={todayTasks} />
          <Stat glass label="새 부탁" value={received} />
          <Stat glass label="7일 일정" value={weekEvents} />
        </div>
      </div>
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
  const [view, setView] = useState<CalView>("month");
  const [editor, setEditor] = useState<EditorTarget | null>(null);

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
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-4">
            <div className="space-y-3">
              <CoverHero onAddPhoto={() => setTab("settings")} />
              <Calendar selected={day} onSelect={setDay} view={view} onViewChange={setView} />
            </div>
            <div className="mt-3 lg:mt-0">
              <DayPanel day={day} onAdd={(k) => add(k)} onOpenEvent={openEvent} onOpenTask={openTask} />
            </div>
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

      <Editor target={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
