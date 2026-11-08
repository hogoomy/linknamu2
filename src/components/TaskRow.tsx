"use client";

import { relativeDue } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { usePlanner } from "./PlannerProvider";
import { Icon, PersonChip } from "./ui";

const toneCls = {
  late: "text-late font-semibold",
  today: "text-accent font-semibold",
  soon: "text-ink-2",
  normal: "text-ink-3",
};

export function TaskRow({ task, onOpen, action }: { task: Task; onOpen: (t: Task) => void; action?: React.ReactNode }) {
  const { me, nameOf, colorOf, setTaskStatus } = usePlanner();
  const done = task.status === "done";
  const due = done ? null : relativeDue(task.due_date);
  const fromMe = task.requester_id === me?.id;
  const toMe = task.assignee_id === me?.id;
  const canAccept = !done && task.status === "requested" && toMe && !fromMe;

  return (
    <li className="flex items-start gap-3 rounded-2xl bg-surface px-3 py-3 ring-1 ring-line">
      <button
        onClick={() => setTaskStatus(task, done ? "requested" : "done")}
        aria-label={done ? `${task.title} 완료 취소` : `${task.title} 완료`}
        aria-pressed={done}
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${
          done ? "border-ok bg-ok text-white" : "border-ink-3 text-transparent hover:border-accent hover:text-accent/50"
        }`}
      >
        <Icon name="check" className="size-4" />
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <p className={`font-medium leading-snug ${done ? "text-ink-3 line-through" : ""}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
          {task.assignee_id === null ? (
            <PersonChip name="함께" color={colorOf(null)} />
          ) : (
            <>
              {task.requester_id !== task.assignee_id && (
                <>
                  <PersonChip name={nameOf(task.requester_id)} color={colorOf(task.requester_id)} />
                  <span aria-label="에서">→</span>
                </>
              )}
              <PersonChip name={nameOf(task.assignee_id)} color={colorOf(task.assignee_id)} />
            </>
          )}
          {task.status === "in_progress" && <span className="font-semibold text-accent">진행 중</span>}
          {due && <span className={toneCls[due.tone]}>· {due.label}</span>}
          {task.memo && <span className="truncate">· {task.memo}</span>}
        </div>
      </button>
      {action ??
        (canAccept && (
          <button
            onClick={() => setTaskStatus(task, "in_progress")}
            className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent"
          >
            할게요
          </button>
        ))}
    </li>
  );
}
