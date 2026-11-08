"use client";

import { addMonths, addWeeks, format, isSameMonth, parseISO } from "date-fns";
import { annivOn } from "@/lib/anniv";
import { eventsOn, monthGrid, tasksOn, todayKey, toKey, weekGrid, WEEKDAYS } from "@/lib/dates";
import { GOOGLE_COLOR, useGoogle } from "./GoogleProvider";
import { usePlanner } from "./PlannerProvider";
import { Card, Icon, Segmented } from "./ui";

export type CalView = "month" | "week";

type Mark = { id: string; title: string; color: string };

export function Calendar({
  selected,
  onSelect,
  onPick,
  view,
  onViewChange,
}: {
  selected: string;
  /** 달/주 이동 (팝업 없이 선택만 바꿈) */
  onSelect: (key: string) => void;
  /** 날짜를 눌렀을 때 (그 날 팝업 열기) */
  onPick: (key: string) => void;
  view: CalView;
  onViewChange: (v: CalView) => void;
}) {
  const { events, tasks, colorOf, met_on, married_on } = usePlanner();
  const google = useGoogle();
  const sel = parseISO(selected);
  const days = view === "month" ? monthGrid(sel) : weekGrid(sel);
  const today = todayKey();

  const move = (dir: 1 | -1) => onSelect(toKey(view === "month" ? addMonths(sel, dir) : addWeeks(sel, dir)));

  return (
    <Card className="px-3 pt-4 pb-3 sm:px-5" title={undefined}>
      <div className="flex items-center gap-1 px-1 pb-4">
        <button onClick={() => move(-1)} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface-2" aria-label={view === "month" ? "이전 달" : "이전 주"}>
          <Icon name="left" />
        </button>
        <h2 className="text-[20px] font-bold tracking-tight whitespace-nowrap tabular-nums">{format(sel, "yyyy년 M월")}</h2>
        <button onClick={() => move(1)} className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface-2" aria-label={view === "month" ? "다음 달" : "다음 주"}>
          <Icon name="right" />
        </button>
        {selected !== today && (
          <button onClick={() => onSelect(today)} className="ml-1 rounded-[10px] bg-accent-soft px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap text-accent">
            오늘
          </button>
        )}
        <Segmented
          className="ml-auto w-[88px] shrink-0"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "month", label: "월" },
            { value: "week", label: "주" },
          ]}
        />
      </div>

      <div className="grid grid-cols-7 text-center text-[13px] font-medium text-ink-3">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-2 ${i === 0 ? "text-late" : i === 6 ? "text-accent" : ""}`}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const key = toKey(d);
          const marks: Mark[] = [
            ...eventsOn(events, key).map((e) => ({ id: e.id, title: e.title, color: colorOf(e.owner_id) })),
            ...eventsOn(google.events, key).map((e) => ({ id: `g-${e.id}`, title: e.title, color: GOOGLE_COLOR })),
          ];
          const open = tasksOn(tasks, key).filter((t) => t.status !== "done").length;
          const anniv = annivOn(key, { met_on, married_on });
          const isSel = key === selected;
          const isToday = key === today;
          const dim = view === "month" && !isSameMonth(d, sel);
          const maxTitles = view === "week" ? 4 : 2;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              aria-label={`${format(d, "M월 d일")} 일정 ${marks.length}개, 할 일 ${open}개`}
              aria-pressed={isSel}
              className={`flex flex-col items-center gap-1 rounded-[14px] px-0.5 pt-1 pb-1.5 transition hover:bg-surface-2 ${
                view === "week" ? "min-h-36" : "min-h-[58px] sm:min-h-[92px]"
              } ${dim ? "opacity-35" : ""}`}
            >
              <span
                title={anniv.map((a) => a.label).join(", ") || undefined}
                className={`relative grid size-8 place-items-center rounded-full text-[15px] tabular-nums ${
                  isSel ? "bg-accent font-bold text-accent-ink" : isToday ? "font-bold text-accent" : d.getDay() === 0 ? "text-late" : "font-medium"
                }`}
              >
                {d.getDate()}
                {anniv.length > 0 && (
                  <span className="absolute -top-1 -right-2 text-[11px] leading-none" aria-label={anniv.map((a) => a.label).join(", ")}>
                    {anniv[0].emoji}
                  </span>
                )}
              </span>

              {/* 휴대폰 월간: 점으로 / 넓은 화면·주간: 제목까지 */}
              <span className={`flex h-1.5 items-center gap-[3px] ${view === "week" ? "hidden" : "sm:hidden"}`} aria-hidden>
                {marks.slice(0, 3).map((m) => (
                  <span key={m.id} className="size-1.5 rounded-full" style={{ background: m.color }} />
                ))}
              </span>
              <span className={`w-full flex-col gap-0.5 ${view === "week" ? "flex" : "hidden sm:flex"}`}>
                {marks.slice(0, maxTitles).map((m) => (
                  <span key={m.id} className="truncate rounded-[5px] px-1 text-left text-[11px] font-medium leading-[1.15rem]" style={{ background: `${m.color}1f`, color: m.color }}>
                    {m.title}
                  </span>
                ))}
                {marks.length > maxTitles && <span className="px-1 text-left text-[10px] text-ink-3">+{marks.length - maxTitles}</span>}
              </span>

              {open > 0 && <span className="text-[10px] leading-none font-bold text-accent">할 일 {open}</span>}
            </button>
          );
        })}
      </div>

      {google.status === "needs-auth" && (
        <button onClick={google.connect} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-surface-2 py-2.5 text-[14px] font-semibold text-ink-2">
          <Icon name="google" className="size-4" /> 구글 일정 다시 불러오기
        </button>
      )}
    </Card>
  );
}
