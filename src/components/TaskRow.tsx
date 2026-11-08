"use client";

import { relativeDue } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { usePlanner } from "./PlannerProvider";
import { Icon, PersonChip, softBtn } from "./ui";

const toneCls = {
  late: "text-late font-semibold",
  today: "text-accent font-semibold",
  soon: "text-ink-2",
  normal: "text-ink-3",
};

/** 토스풍 리스트 한 줄: 체크 · 제목/정보 · 오른쪽 버튼 */
export function TaskRow({ task, onOpen, action }: { task: Task; onOpen: (t: Task) => void; action?: React.ReactNode }) {
  const { me, nameOf, colorOf, setTaskStatus } = usePlanner();
  const done = task.status === "done";
  const due = done ? null : relativeDue(task.due_date);
  const fromMe = task.requester_id === me?.id;
  const toMe = task.assignee_id === me?.id;
  const canAccept = !done && task.status === "requested" && toMe && !fromMe;

  return (
    <li className="flex items-center gap-3.5 py-3">
      <button
        onClick={() => setTaskStatus(task, done ? "requested" : "done")}
        aria-label={done ? `${task.title} 완료 취소` : `${task.title} 완료`}
        aria-pressed={done}
        className={`grid size-[26px] shrink-0 place-items-center rounded-full transition active:scale-90 ${
          done ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-3/60 hover:text-accent"
        }`}
      >
        <Icon name="check" className="size-4" />
      </button>
      <button onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
        <p className={`text-[16px] leading-snug font-medium ${done ? "text-ink-3 line-through" : ""}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
          {task.assignee_id === null ? (
            <PersonChip name="함께" color={colorOf(null)} />
          ) : (
            <>
              {task.requester_id !== task.assignee_id && (
                <>
                  <PersonChip name={nameOf(task.requester_id)} color={colorOf(task.requester_id)} />
                  <span aria-label="에서" className="text-ink-3">→</span>
                </>
              )}
              <PersonChip name={nameOf(task.assignee_id)} color={colorOf(task.assignee_id)} />
            </>
          )}
          {task.status === "in_progress" && <span className="font-semibold text-accent">진행 중</span>}
          {due && <span className={toneCls[due.tone]}>{due.label}</span>}
          {task.memo && <span className="max-w-full truncate">{task.memo}</span>}
        </div>
      </button>
      {action ??
        (canAccept ? (
          <button onClick={() => setTaskStatus(task, "in_progress")} className={`shrink-0 ${softBtn}`}>
            할게요
          </button>
        ) : (
          <Icon name="chevron" className="size-4 shrink-0 text-ink-3/60" />
        ))}
    </li>
  );
}
