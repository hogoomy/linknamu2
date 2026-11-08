"use client";

import { addMonths, addWeeks, format, isSameMonth, parseISO } from "date-fns";
import { eventsOn, monthGrid, tasksOn, todayKey, toKey, weekGrid, WEEKDAYS } from "@/lib/dates";
import { usePlanner } from "./PlannerProvider";
import { Icon, Segmented } from "./ui";

export type CalView = "month" | "week";

export function Calendar({
  selected,
  onSelect,
  view,
  onViewChange,
}: {
  selected: string;
  onSelect: (key: string) => void;
  view: CalView;
  onViewChange: (v: CalView) => void;
}) {
  const { events, tasks, colorOf } = usePlanner();
  const sel = parseISO(selected);
  const days = view === "month" ? monthGrid(sel) : weekGrid(sel);
  const today = todayKey();

  const move = (dir: 1 | -1) => {
    const next = view === "month" ? addMonths(sel, dir) : addWeeks(sel, dir);
    onSelect(toKey(next));
  };

  return (
    <section aria-label="달력">
      <div className="flex items-center gap-1 pb-3 sm:gap-2">
        <button onClick={() => move(-1)} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label={view === "month" ? "이전 달" : "이전 주"}>
          <Icon name="left" />
        </button>
        <h1 className="text-center text-lg font-bold whitespace-nowrap tabular-nums sm:min-w-28 sm:text-xl">{format(sel, "yyyy. M월")}</h1>
        <button onClick={() => move(1)} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label={view === "month" ? "다음 달" : "다음 주"}>
          <Icon name="right" />
        </button>
        <button onClick={() => onSelect(today)} className="ml-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-ink-2 hover:bg-surface-2">
          오늘
        </button>
        <Segmented
          className="ml-auto w-24 shrink-0 sm:w-28"
          value={view}
          onChange={onViewChange}
          options={[
            { value: "month", label: "월" },
            { value: "week", label: "주" },
          ]}
        />
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-3">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-2 ${i === 0 ? "text-late/80" : ""}`}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {days.map((d) => {
          const key = toKey(d);
          const dayEvents = eventsOn(events, key);
          const dayTasks = tasksOn(tasks, key);
          const open = dayTasks.filter((t) => t.status !== "done").length;
          const isSel = key === selected;
          const isToday = key === today;
          const dim = view === "month" && !isSameMonth(d, sel);
          const max = view === "week" ? 5 : 2;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-label={`${format(d, "M월 d일")} 일정 ${dayEvents.length}개, 할 일 ${open}개`}
              aria-pressed={isSel}
              className={`relative flex flex-col items-stretch gap-0.5 bg-surface p-1 text-left transition ${
                view === "week" ? "min-h-40" : "min-h-[4.6rem] sm:min-h-24"
              } ${isSel ? "bg-accent-soft!" : "hover:bg-surface-2"} ${dim ? "opacity-45" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                    isToday ? "bg-accent text-accent-ink" : d.getDay() === 0 ? "text-late/80" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
                {open > 0 && (
                  <span className="rounded-full bg-ink px-1.5 text-[10px] font-bold leading-4 text-bg" title="남은 할 일">
                    {open}
                  </span>
                )}
              </div>
              {dayEvents.slice(0, max).map((e) => (
                <span
                  key={e.id}
                  className="truncate rounded-md px-1 text-[11px] font-medium leading-[1.15rem]"
                  style={{ background: `${colorOf(e.owner_id)}26`, color: colorOf(e.owner_id) }}
                >
                  {e.title}
                </span>
              ))}
              {dayEvents.length > max && <span className="px-1 text-[10px] text-ink-3">+{dayEvents.length - max}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
