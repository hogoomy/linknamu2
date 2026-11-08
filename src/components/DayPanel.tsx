"use client";

import { annivOn } from "@/lib/anniv";
import { eventsOn, prettyDate, tasksOn, timeRange, todayKey } from "@/lib/dates";
import type { PlannerEvent, Task } from "@/lib/types";
import { GOOGLE_COLOR, useGoogle } from "./GoogleProvider";
import { usePlanner } from "./PlannerProvider";
import { TaskRow } from "./TaskRow";
import { Icon, Sheet, softBtn } from "./ui";

/** 달력에서 날짜를 누르면 아래에서 올라오는 그 날의 일정·할 일 */
export function DaySheet({
  day,
  open,
  onClose,
  onAdd,
  onOpenEvent,
  onOpenTask,
}: {
  day: string;
  open: boolean;
  onClose: () => void;
  onAdd: (kind: "event" | "task") => void;
  onOpenEvent: (e: PlannerEvent) => void;
  onOpenTask: (t: Task) => void;
}) {
  const title = `${day === todayKey() ? "오늘 · " : ""}${prettyDate(day)}`;
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <DayContent day={day} onAdd={onAdd} onOpenEvent={onOpenEvent} onOpenTask={onOpenTask} />
    </Sheet>
  );
}

function DayContent({
  day,
  onAdd,
  onOpenEvent,
  onOpenTask,
}: {
  day: string;
  onAdd: (kind: "event" | "task") => void;
  onOpenEvent: (e: PlannerEvent) => void;
  onOpenTask: (t: Task) => void;
}) {
  const { events, tasks, colorOf, nameOf, saveTask, met_on, married_on } = usePlanner();
  const google = useGoogle();
  const dayEvents = eventsOn(events, day);
  const gEvents = eventsOn(google.events, day);
  const dayTasks = tasksOn(tasks, day).sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
  const unscheduled = tasks.filter((t) => !t.due_date && t.status !== "done");
  const anniv = annivOn(day, { met_on, married_on });
  const hasEvents = dayEvents.length + gEvents.length + anniv.length > 0;

  const schedule = (t: Task) => saveTask({ title: t.title, assignee_id: t.assignee_id, due_date: day, memo: t.memo }, t.id);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onAdd("event")} className="min-h-12 rounded-[14px] bg-surface-2 text-[16px] font-semibold text-ink-2 transition active:scale-[0.98]">
          + 일정
        </button>
        <button onClick={() => onAdd("task")} className="min-h-12 rounded-[14px] bg-accent-soft text-[16px] font-semibold text-accent transition active:scale-[0.98]">
          + 할 일 · 부탁
        </button>
      </div>

      {!hasEvents && dayTasks.length === 0 && <p className="py-2 text-center text-[15px] text-ink-3">비어 있는 날이에요. 위 버튼으로 추가해 보세요.</p>}

      {hasEvents && (
        <section>
          <h3 className="text-[14px] font-semibold text-ink-3">일정</h3>
          <ul>
            {anniv.map((a) => (
              <li key={a.label} className="flex items-center gap-3.5 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-[20px]" aria-hidden>
                  {a.emoji}
                </span>
                <span className="text-[16px] font-bold">{a.label}</span>
              </li>
            ))}
            {dayEvents.map((e) => (
              <li key={e.id}>
                <button onClick={() => onOpenEvent(e)} className="flex w-full items-center gap-3.5 py-3 text-left">
                  <span className="h-10 w-[5px] shrink-0 rounded-full" style={{ background: colorOf(e.owner_id) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium">{e.title}</span>
                    <span className="text-[13px] text-ink-3">
                      {timeRange(e)} · {nameOf(e.owner_id)}
                      {e.memo && ` · ${e.memo}`}
                    </span>
                  </span>
                  <Icon name="chevron" className="size-4 shrink-0 text-ink-3/60" />
                </button>
              </li>
            ))}
            {gEvents.map((e) => {
              const inner = (
                <>
                  <span className="h-10 w-[5px] shrink-0 rounded-full" style={{ background: e.color ?? GOOGLE_COLOR }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium">{e.title}</span>
                    <span className="flex items-center gap-1 text-[13px] text-ink-3">
                      <Icon name="google" className="size-3.5" /> {timeRange(e)} · {e.calendar}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={`g-${e.id}`}>
                  {e.link ? (
                    <a href={e.link} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3.5 py-3">
                      {inner}
                      <Icon name="chevron" className="size-4 shrink-0 text-ink-3/60" />
                    </a>
                  ) : (
                    <div className="flex w-full items-center gap-3.5 py-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {dayTasks.length > 0 && (
        <section>
          <h3 className="text-[14px] font-semibold text-ink-3">할 일</h3>
          <ul>
            {dayTasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
            ))}
          </ul>
        </section>
      )}

      {unscheduled.length > 0 && (
        <section className="border-t border-line pt-4">
          <h3 className="text-[14px] font-semibold text-ink-3">언제 할까? · 날짜 안 정한 일</h3>
          <ul>
            {unscheduled.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onOpen={onOpenTask}
                action={
                  <button onClick={() => schedule(t)} className={`shrink-0 ${softBtn}`}>
                    이 날 하기
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
