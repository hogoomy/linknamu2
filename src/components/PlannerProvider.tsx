"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getBackend } from "@/lib/backend";
import type { Backend, EventInput, Profile, Snapshot, Task, TaskInput, TaskStatus } from "@/lib/types";

type Status = "loading" | "ready" | "error";

type Ctx = Snapshot & {
  backend: Backend;
  status: Status;
  error: string | null;
  toast: string | null;
  showToast: (msg: string) => void;
  refresh: () => Promise<void>;
  /** id → 표시 이름 ('나' / 상대 이름 / '함께') */
  nameOf: (id: string | null) => string;
  colorOf: (id: string | null) => string;
  saveEvent: (input: EventInput, id?: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  saveTask: (input: TaskInput, id?: string) => Promise<void>;
  setTaskStatus: (task: Task, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
};

const PlannerContext = createContext<Ctx | null>(null);

const EMPTY: Snapshot = { me: null, partner: null, inviteCode: null, events: [], tasks: [] };
export const TOGETHER_COLOR = "#a16207";

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setSnap(await backend.load());
      setStatus("ready");
      setError(null);
    } catch (e) {
      setError(messageOf(e));
      setStatus("error");
    }
  }, [backend]);

  useEffect(() => {
    // 최초 로드 + 백엔드 변경(실시간/다른 탭/로그인) 시 다시 불러오기
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = backend.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 80);
    });
    const first = setTimeout(() => void refresh(), 0);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      off();
      window.removeEventListener("focus", onFocus);
      if (timer) clearTimeout(timer);
      clearTimeout(first);
    };
  }, [backend, refresh]);

  const { me, partner } = snap;

  const nameOf = useCallback(
    (id: string | null) => {
      if (!id) return "함께";
      if (id === me?.id) return "나";
      if (id === partner?.id) return partner.name || "상대";
      return "알 수 없음";
    },
    [me, partner],
  );

  const colorOf = useCallback(
    (id: string | null) => {
      if (!id) return TOGETHER_COLOR;
      const p: Profile | null | undefined = id === me?.id ? me : id === partner?.id ? partner : null;
      return p?.color ?? "#94a3b8";
    },
    [me, partner],
  );

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>, okMsg?: string): Promise<T | undefined> => {
      try {
        const r = await fn();
        if (okMsg) showToast(okMsg);
        return r;
      } catch (e) {
        showToast(messageOf(e));
        return undefined;
      }
    },
    [showToast],
  );

  const value: Ctx = {
    ...snap,
    backend,
    status,
    error,
    toast,
    showToast,
    refresh,
    nameOf,
    colorOf,
    saveEvent: async (input, id) => {
      await guard(() => backend.saveEvent(input, id), id ? "일정을 고쳤어요" : "일정을 추가했어요");
    },
    deleteEvent: async (id) => {
      await guard(() => backend.deleteEvent(id), "일정을 지웠어요");
    },
    saveTask: async (input, id) => {
      const isNewRequest = !id && !!partner && input.assignee_id === partner.id;
      const saved = await guard(
        () => backend.saveTask(input, id),
        id ? "할 일을 고쳤어요" : isNewRequest ? `${partner?.name || "상대"}에게 부탁했어요` : "할 일을 추가했어요",
      );
      if (saved && isNewRequest) void backend.notify("task_requested", saved.id);
    },
    setTaskStatus: async (task, next) => {
      const saved = await guard(() => backend.setTaskStatus(task.id, next));
      if (saved && next === "done" && task.requester_id !== me?.id) void backend.notify("task_done", task.id);
    },
    deleteTask: async (id) => {
      await guard(() => backend.deleteTask(id), "할 일을 지웠어요");
    },
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("PlannerProvider 안에서만 사용할 수 있어요");
  return ctx;
}

function messageOf(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "문제가 생겼어요. 다시 시도해 주세요";
}
