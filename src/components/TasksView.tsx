"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { usePlanner } from "./PlannerProvider";
import { TaskRow } from "./TaskRow";
import { Segmented } from "./ui";

type Tab = "received" | "sent" | "together";

const byDue = (a: Task, b: Task) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");

export function TasksView({ onOpenTask }: { onOpenTask: (t: Task) => void }) {
  const { me, partner, tasks } = usePlanner();
  const [tab, setTab] = useState<Tab>("received");
  const [showDone, setShowDone] = useState(false);

  const filters: Record<Tab, (t: Task) => boolean> = {
    received: (t) => t.assignee_id === me?.id,
    sent: (t) => t.requester_id === me?.id && t.assignee_id === (partner?.id ?? "__none__"),
    together: (t) => t.assignee_id === null,
  };
  const list = tasks.filter(filters[tab]);
  const open = list.filter((t) => t.status !== "done");
  const scheduled = open.filter((t) => t.due_date).sort(byDue);
  const unscheduled = open.filter((t) => !t.due_date);
  const done = list.filter((t) => t.status === "done").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  const count = (k: Tab) => tasks.filter(filters[k]).filter((t) => t.status !== "done").length;
  const label = (text: string, k: Tab) => (
    <>
      {text}
      {count(k) > 0 && <span className="ml-1 text-accent">{count(k)}</span>}
    </>
  );

  const empty: Record<Tab, string> = {
    received: "내가 할 일이 없어요. 오늘은 여유로운 날!",
    sent: `${partner?.name || "상대"}에게 부탁한 일이 없어요.`,
    together: "함께 할 일이 비어 있어요.",
  };

  return (
    <section aria-label="할 일" className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "received", label: label("내 할 일", "received") },
          { value: "sent", label: label("부탁한 일", "sent") },
          { value: "together", label: label("함께", "together") },
        ]}
      />

      {open.length === 0 && <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">{empty[tab]}</p>}

      {scheduled.length > 0 && (
        <ul className="space-y-2">
          {scheduled.map((t) => (
            <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
          ))}
        </ul>
      )}

      {unscheduled.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink-2">언제 할까? · 날짜 미정</h3>
          <ul className="space-y-2">
            {unscheduled.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
            ))}
          </ul>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone((v) => !v)} className="mb-2 text-sm font-bold text-ink-3" aria-expanded={showDone}>
            완료 {done.length}개 {showDone ? "접기" : "보기"}
          </button>
          {showDone && (
            <ul className="space-y-2">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={onOpenTask} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
