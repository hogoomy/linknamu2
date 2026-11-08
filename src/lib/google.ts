"use client";

import { addDays, addMonths, format, parseISO, startOfMonth } from "date-fns";
import type { PlannerEvent } from "./types";

/**
 * 구글 캘린더 연동 (브라우저에서 직접, 서버 없음)
 * - 읽기: Google Identity Services 로 이 기기에서 권한을 받아 내 캘린더 일정을 불러와 달력에 함께 표시
 * - 내보내기: 앱 일정을 '구글 캘린더에 추가' 링크로 열기 (로그인·설정 불필요)
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID 가 없으면 예시 일정으로 동작한다.
 */

export type GoogleEvent = {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  link: string | null;
  calendar: string;
  color: string | null;
};

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const TOKEN_KEY = "couple-planner-google-token";
export const GOOGLE_CONNECTED_KEY = "couple-planner-google-on";

export const googleConfigured = () => Boolean(CLIENT_ID);

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
type GoogleGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void;
        error_callback?: (e: { type: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done: () => void) => void;
    };
  };
};

function loadGis(): Promise<GoogleGlobal> {
  const w = window as unknown as { google?: GoogleGlobal };
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("구글 로그인을 불러오지 못했어요")));
    s.onerror = () => reject(new Error("구글 로그인을 불러오지 못했어요"));
    document.head.appendChild(s);
  });
}

function storedToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, exp } = JSON.parse(raw) as { token: string; exp: number };
    return Date.now() < exp ? token : null;
  } catch {
    return null;
  }
}

/** 사용자가 버튼을 눌렀을 때 호출 (팝업이 막히지 않도록) */
export async function requestGoogleToken(): Promise<string> {
  if (!CLIENT_ID) throw new Error("구글 연동 설정(NEXT_PUBLIC_GOOGLE_CLIENT_ID)이 없어요");
  const g = await loadGis();
  return new Promise((resolve, reject) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return reject(new Error("구글 캘린더 권한을 받지 못했어요"));
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + ((r.expires_in ?? 3600) - 60) * 1000 }));
          localStorage.setItem(GOOGLE_CONNECTED_KEY, "1");
        } catch {
          /* 저장 불가 환경 */
        }
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error(e.type === "popup_closed" ? "구글 연결을 취소했어요" : "구글 연결에 실패했어요")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export function forgetGoogle() {
  try {
    const token = storedToken();
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GOOGLE_CONNECTED_KEY);
    const w = window as unknown as { google?: GoogleGlobal };
    if (token) w.google?.accounts.oauth2.revoke(token, () => undefined);
  } catch {
    /* noop */
  }
}

export function wasConnected() {
  try {
    return localStorage.getItem(GOOGLE_CONNECTED_KEY) === "1";
  } catch {
    return false;
  }
}

export const hasValidToken = () => Boolean(storedToken());

type ApiEvent = {
  id: string;
  summary?: string;
  status?: string;
  htmlLink?: string;
  colorId?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
};

function toGoogleEvent(e: ApiEvent, calendar: string, color: string | null): GoogleEvent | null {
  if (e.status === "cancelled") return null;
  const title = e.summary || "(제목 없음)";
  if (e.start.date) {
    // 종일 일정: 끝 날짜는 '다음 날'로 오므로 하루 빼기
    const end = e.end.date ? format(addDays(parseISO(e.end.date), -1), "yyyy-MM-dd") : null;
    return { id: e.id, title, date: e.start.date, end_date: end && end !== e.start.date ? end : null, start_time: null, end_time: null, link: e.htmlLink ?? null, calendar, color };
  }
  if (!e.start.dateTime) return null;
  const s = new Date(e.start.dateTime);
  const en = e.end.dateTime ? new Date(e.end.dateTime) : null;
  const d = format(s, "yyyy-MM-dd");
  const ed = en ? format(en, "yyyy-MM-dd") : null;
  return {
    id: e.id,
    title,
    date: d,
    end_date: ed && ed !== d ? ed : null,
    start_time: format(s, "HH:mm"),
    end_time: en ? format(en, "HH:mm") : null,
    link: e.htmlLink ?? null,
    calendar,
    color,
  };
}

/** 이번 달 기준 앞뒤로 일정 불러오기 (보이는 캘린더 전체) */
export async function fetchGoogleEvents(around: Date = new Date()): Promise<GoogleEvent[]> {
  if (!CLIENT_ID) return sampleGoogleEvents();
  const token = storedToken();
  if (!token) throw new Error("NEED_AUTH");
  const headers = { Authorization: `Bearer ${token}` };
  const timeMin = startOfMonth(addMonths(around, -1)).toISOString();
  const timeMax = startOfMonth(addMonths(around, 3)).toISOString();

  const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader", { headers });
  if (listRes.status === 401) throw new Error("NEED_AUTH");
  const list = (await listRes.json()) as { items?: { id: string; summary: string; selected?: boolean; backgroundColor?: string }[] };
  const cals = (list.items ?? []).filter((c) => c.selected !== false).slice(0, 10);

  const all = await Promise.all(
    cals.map(async (c) => {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events`);
      url.search = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250" }).toString();
      const r = await fetch(url, { headers });
      if (!r.ok) return [];
      const data = (await r.json()) as { items?: ApiEvent[] };
      return (data.items ?? []).map((e) => toGoogleEvent(e, c.summary, c.backgroundColor ?? null)).filter((e): e is GoogleEvent => !!e);
    }),
  );
  return all.flat();
}

/** 설정 전 체험용 예시 */
export function sampleGoogleEvents(): GoogleEvent[] {
  const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
  return [
    { id: "g1", title: "팀 주간 회의", date: d(1), end_date: null, start_time: "10:00", end_time: "11:00", link: null, calendar: "예시 · 회사", color: null },
    { id: "g2", title: "치과 정기검진", date: d(4), end_date: null, start_time: "14:30", end_time: "15:00", link: null, calendar: "예시 · 개인", color: null },
    { id: "g3", title: "친구 결혼식", date: d(9), end_date: null, start_time: "12:00", end_time: null, link: null, calendar: "예시 · 개인", color: null },
  ];
}

/** 앱 일정 → 구글 캘린더 '일정 추가' 화면 링크 (로그인한 구글 계정으로 저장) */
export function googleAddLink(e: Pick<PlannerEvent, "title" | "date" | "end_date" | "start_time" | "end_time" | "memo">) {
  const compact = (s: string) => s.replace(/-/g, "");
  let dates: string;
  if (!e.start_time) {
    const end = format(addDays(parseISO(e.end_date ?? e.date), 1), "yyyyMMdd");
    dates = `${compact(e.date)}/${end}`;
  } else {
    const st = `${compact(e.date)}T${e.start_time.replace(":", "")}00`;
    const endTime = e.end_time ?? e.start_time;
    const et = `${compact(e.end_date ?? e.date)}T${endTime.replace(":", "")}00`;
    dates = `${st}/${et}`;
  }
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: e.memo || "우리집 플래너에서 추가", ctz: "Asia/Seoul" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
