"use client";

import { useState } from "react";
import type { PlannerEvent, Task, TaskStatus } from "@/lib/types";
import { usePlanner } from "./PlannerProvider";
import { Field, Icon, inputCls, Segmented, Sheet } from "./ui";

export type EditorTarget =
  | { kind: "event"; date: string; item?: PlannerEvent }
  | { kind: "task"; date: string | null; item?: Task };

export function Editor({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  const title = !target ? "" : target.item ? (target.kind === "event" ? "일정 고치기" : "할 일 고치기") : "새로 추가";
  return (
    <Sheet open={!!target} onClose={onClose} title={title}>
      {/* key 로 대상이 바뀔 때마다 폼 초기화 */}
      {target && <EditorForm key={`${target.kind}-${target.item?.id ?? "new"}-${target.date}`} target={target} onClose={onClose} />}
    </Sheet>
  );
}

function EditorForm({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const { me, partner, colorOf, saveEvent, deleteEvent, saveTask, deleteTask, setTaskStatus } = usePlanner();
  const isNew = !target.item;
  const [kind, setKind] = useState<"event" | "task">(target.kind);

  const ev = target.kind === "event" ? target.item : undefined;
  const tk = target.kind === "task" ? target.item : undefined;

  const [titleText, setTitleText] = useState(ev?.title ?? tk?.title ?? "");
  const [date, setDate] = useState(ev?.date ?? tk?.due_date ?? target.date ?? "");
  const [endDate, setEndDate] = useState(ev?.end_date ?? "");
  const [allDay, setAllDay] = useState(ev ? !ev.start_time : true);
  const [startTime, setStartTime] = useState(ev?.start_time ?? "09:00");
  const [endTime, setEndTime] = useState(ev?.end_time ?? "10:00");
  const [memo, setMemo] = useState(ev?.memo ?? tk?.memo ?? "");
  // 기본: 새 할 일은 상대에게 부탁, 새 일정은 함께
  const [who, setWho] = useState<string>(
    ev ? (ev.owner_id ?? "both") : tk ? (tk.assignee_id ?? "both") : kind === "task" && partner ? partner.id : "both",
  );
  const [noDate, setNoDate] = useState(tk ? !tk.due_date : target.kind === "task" && !target.date);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const people = [
    ...(partner ? [{ id: partner.id, label: partner.name || "상대" }] : []),
    ...(me ? [{ id: me.id, label: "나" }] : []),
    { id: "both", label: "함께" },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleText.trim()) return;
    setBusy(true);
    const whoId = who === "both" ? null : who;
    if (kind === "event") {
      if (!date) return setBusy(false);
      await saveEvent(
        {
          title: titleText.trim(),
          date,
          end_date: endDate && endDate > date ? endDate : null,
          start_time: allDay ? null : startTime,
          end_time: allDay ? null : endTime || null,
          owner_id: whoId,
          memo: memo.trim(),
        },
        ev?.id,
      );
    } else {
      await saveTask({ title: titleText.trim(), assignee_id: whoId, due_date: noDate || !date ? null : date, memo: memo.trim() }, tk?.id);
    }
    setBusy(false);
    onClose();
  };

  const remove = async () => {
    // 확인 창 대신 두 번 누르기 (홈 화면 앱·임베드에서도 동작)
    if (!confirmDelete) return setConfirmDelete(true);
    if (ev) await deleteEvent(ev.id);
    if (tk) await deleteTask(tk.id);
    onClose();
  };

  const statusLabels: Record<TaskStatus, string> = { requested: "부탁함", in_progress: "진행 중", done: "완료" };

  return (
    <form onSubmit={submit} className="space-y-4">
      {isNew && (
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (k === "task" && who === "both" && partner) setWho(partner.id);
          }}
          options={[
            { value: "event", label: "일정" },
            { value: "task", label: "할 일 · 부탁" },
          ]}
        />
      )}

      <Field label={kind === "event" ? "무슨 일정인가요?" : "무엇을 할까요?"}>
        <input
          autoFocus={isNew}
          className={inputCls}
          value={titleText}
          onChange={(e) => setTitleText(e.target.value)}
          placeholder={kind === "event" ? "예) 친구 결혼식" : "예) 퇴근길에 우유 사 오기"}
          required
          maxLength={100}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-semibold text-ink-2">{kind === "event" ? "누구 일정?" : "누가 할까요?"}</span>
        <div className="flex gap-2" role="radiogroup">
          {people.map((p) => {
            const color = colorOf(p.id === "both" ? null : p.id);
            const on = who === p.id;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={on}
                key={p.id}
                onClick={() => setWho(p.id)}
                className="min-h-11 flex-1 rounded-xl border-2 px-2 text-sm font-semibold"
                style={on ? { borderColor: color, background: `${color}1f`, color } : { borderColor: "var(--line)", background: "transparent", color: "var(--ink-2)" }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {kind === "task" && partner && who === partner.id && (
          <p className="mt-1.5 text-xs text-ink-3">{partner.name || "상대"}에게 부탁으로 보내고 알림이 가요.</p>
        )}
      </div>

      {kind === "event" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="날짜">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="끝나는 날 (선택)">
              <input type="date" className={inputCls} value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            종일
          </label>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작">
                <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </Field>
              <Field label="끝">
                <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} />
            날짜는 나중에 정할게요 (언제 할까?)
          </label>
          {!noDate && (
            <Field label="언제까지?">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}
        </>
      )}

      <Field label="메모 (선택)">
        <textarea className={`${inputCls} min-h-20 resize-none`} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="필요한 내용을 적어 두세요" maxLength={500} />
      </Field>

      {tk && (
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-ink-2">진행 상태</span>
          <Segmented
            value={tk.status}
            onChange={async (s) => {
              await setTaskStatus(tk, s);
              onClose();
            }}
            options={(Object.keys(statusLabels) as TaskStatus[]).map((s) => ({ value: s, label: statusLabels[s] }))}
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {!isNew && (
          <button
            type="button"
            onClick={remove}
            onBlur={() => setConfirmDelete(false)}
            className={`flex h-12 shrink-0 items-center justify-center gap-1 rounded-2xl border px-3.5 text-sm font-bold ${confirmDelete ? "border-late bg-late text-white" : "border-line text-late"}`}
            aria-label={confirmDelete ? "한 번 더 눌러 지우기" : "지우기"}
          >
            <Icon name="trash" />
            {confirmDelete && "지우기"}
          </button>
        )}
        <button type="submit" disabled={busy} className="min-h-12 flex-1 rounded-2xl bg-accent text-base font-bold text-accent-ink disabled:opacity-50">
          {busy ? "저장 중…" : isNew ? (kind === "task" && partner && who === partner.id ? "부탁하기" : "추가하기") : "저장"}
        </button>
      </div>
    </form>
  );
}
