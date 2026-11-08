"use client";

import { eventsOn, prettyDate, tasksOn, timeRange, todayKey } from "@/lib/dates";
import type { PlannerEvent, Task } from "@/lib/types";
import { usePlanner } from "./PlannerProvider";
import { TaskRow } from "./TaskRow";
import { Icon } from "./ui";

export function DayPanel({
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
  const { events, tasks, colorOf, nameOf, saveTask } = usePlanner();
  const dayEvents = eventsOn(events, day);
  const dayTasks = tasksOn(tasks, day).sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
  const unscheduled = tasks.filter((t) => !t.due_date && t.status !== "done");

  const schedule = (t: Task) =>
    saveTask({ title: t.title, assignee_id: t.assignee_id, due_date: day, memo: t.memo }, t.id);

  return (
    <section aria-label={`${prettyDate(day)} 상세`} className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-ink-3">{day === todayKey() ? "오늘" : "선택한 날"}</p>
          <h2 className="text-lg font-bold">{prettyDate(day)}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAdd("event")} className="rounded-full border border-line px-3 py-2 text-sm font-semibold hover:bg-surface-2">
            + 일정
          </button>
          <button onClick={() => onAdd("task")} className="rounded-full bg-ink px-3 py-2 text-sm font-semibold text-bg">
            + 할 일
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-ink-2">일정</h3>
        {dayEvents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-3">비어 있는 날이에요.</p>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => onOpenEvent(e)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left ring-1 ring-line hover:bg-surface-2"
                >
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: colorOf(e.owner_id) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.title}</span>
                    <span className="text-xs text-ink-3">
                      {timeRange(e)} · {nameOf(e.owner_id)}
                      {e.memo && ` · ${e.memo}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-ink-2">할 일</h3>
        {dayTasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-3">이 날 마감인 할 일이 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {dayTasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
            ))}
          </ul>
        )}
      </div>

      {unscheduled.length > 0 && (
        <div>
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink-2">
            <Icon name="clock" className="size-4" /> 언제 할까?
          </h3>
          <p className="mb-2 text-xs text-ink-3">날짜가 안 정해진 할 일이에요. 이 날로 옮겨서 정해 보세요.</p>
          <ul className="space-y-2">
            {unscheduled.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onOpen={onOpenTask}
                action={
                  <button onClick={() => schedule(t)} className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">
                    이 날 하기
                  </button>
                }
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
