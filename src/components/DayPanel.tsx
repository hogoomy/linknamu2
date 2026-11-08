"use client";

import { eventsOn, prettyDate, tasksOn, timeRange, todayKey } from "@/lib/dates";
import type { PlannerEvent, Task } from "@/lib/types";
import { GOOGLE_COLOR, useGoogle } from "./GoogleProvider";
import { usePlanner } from "./PlannerProvider";
import { TaskRow } from "./TaskRow";
import { Card, Icon, secondaryBtn, softBtn } from "./ui";

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
  const google = useGoogle();
  const dayEvents = eventsOn(events, day);
  const gEvents = eventsOn(google.events, day);
  const dayTasks = tasksOn(tasks, day).sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
  const unscheduled = tasks.filter((t) => !t.due_date && t.status !== "done");
  const empty = dayEvents.length + gEvents.length === 0;

  const schedule = (t: Task) => saveTask({ title: t.title, assignee_id: t.assignee_id, due_date: day, memo: t.memo }, t.id);

  return (
    <div className="space-y-3" aria-label={`${prettyDate(day)} 상세`}>
      <Card
        title={
          <span className="flex flex-col">
            <span className="text-[13px] font-medium text-ink-3">{day === todayKey() ? "오늘" : "선택한 날"}</span>
            {prettyDate(day)}
          </span>
        }
        action={
          <div className="flex gap-2">
            <button onClick={() => onAdd("event")} className={secondaryBtn}>
              + 일정
            </button>
            <button onClick={() => onAdd("task")} className={softBtn}>
              + 할 일
            </button>
          </div>
        }
      >
        <h3 className="mt-1 text-[14px] font-semibold text-ink-3">일정</h3>
        {empty ? (
          <p className="py-3 text-[15px] text-ink-3">비어 있는 날이에요.</p>
        ) : (
          <ul>
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
        )}

        <h3 className="mt-3 text-[14px] font-semibold text-ink-3">할 일</h3>
        {dayTasks.length === 0 ? (
          <p className="py-3 text-[15px] text-ink-3">이 날 마감인 할 일이 없어요.</p>
        ) : (
          <ul>
            {dayTasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
            ))}
          </ul>
        )}
      </Card>

      {unscheduled.length > 0 && (
        <Card
          title={
            <span className="flex flex-col">
              <span className="text-[13px] font-medium text-ink-3">날짜가 안 정해진 일</span>
              언제 할까?
            </span>
          }
        >
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
        </Card>
      )}
    </div>
  );
}
