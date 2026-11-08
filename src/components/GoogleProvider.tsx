"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  fetchGoogleEvents,
  forgetGoogle,
  GOOGLE_CONNECTED_KEY,
  googleConfigured,
  hasValidToken,
  requestGoogleToken,
  type GoogleEvent,
  wasConnected,
} from "@/lib/google";
import { usePlanner } from "./PlannerProvider";

export type GoogleStatus = "off" | "needs-auth" | "loading" | "on";

type Ctx = {
  status: GoogleStatus;
  events: GoogleEvent[];
  /** 설정 전이라 예시 일정을 보여주는 중 */
  sample: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  reload: () => Promise<void>;
};

const GoogleContext = createContext<Ctx | null>(null);

export function GoogleProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = usePlanner();
  const sample = !googleConfigured();
  const [status, setStatus] = useState<GoogleStatus>("off");
  const [events, setEvents] = useState<GoogleEvent[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setEvents(await fetchGoogleEvents());
      setStatus("on");
    } catch (e) {
      if (e instanceof Error && e.message === "NEED_AUTH") {
        setStatus("needs-auth");
      } else {
        setStatus("needs-auth");
        showToast("구글 일정을 불러오지 못했어요");
      }
    }
  }, [showToast]);

  // 이전에 연결했던 기기면 자동으로 불러오기 (토큰이 만료됐으면 '다시 불러오기' 버튼 표시)
  useEffect(() => {
    if (!wasConnected()) return;
    const t = setTimeout(() => {
      if (sample || hasValidToken()) void load();
      else setStatus("needs-auth");
    }, 0);
    return () => clearTimeout(t);
  }, [load, sample]);

  const connect = useCallback(async () => {
    try {
      if (sample) {
        try {
          localStorage.setItem(GOOGLE_CONNECTED_KEY, "1");
        } catch {
          /* noop */
        }
      } else {
        await requestGoogleToken();
      }
      await load();
      showToast(sample ? "예시 구글 일정을 보여드려요" : "구글 캘린더를 연결했어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "구글 연결에 실패했어요");
    }
  }, [load, sample, showToast]);

  const disconnect = useCallback(() => {
    forgetGoogle();
    setEvents([]);
    setStatus("off");
    showToast("구글 캘린더 연결을 해제했어요");
  }, [showToast]);

  return (
    <GoogleContext.Provider value={{ status, events, sample, connect, disconnect, reload: load }}>{children}</GoogleContext.Provider>
  );
}

export function useGoogle() {
  const ctx = useContext(GoogleContext);
  if (!ctx) throw new Error("GoogleProvider 안에서만 사용할 수 있어요");
  return ctx;
}

export const GOOGLE_COLOR = "#8b95a1";
