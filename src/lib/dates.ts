import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import type { Task } from "./types";

export const toKey = (d: Date) => format(d, "yyyy-MM-dd");
export const todayKey = () => toKey(new Date());
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function monthGrid(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });
}

export function weekGrid(day: Date): Date[] {
  const start = startOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 여러 날 일정도 포함해서 해당 날짜에 걸치는지 */
type Dated = { date: string; end_date: string | null; start_time: string | null; end_time: string | null };

export function eventOnDay(e: Dated, key: string) {
  const end = e.end_date ?? e.date;
  return e.date <= key && key <= end;
}

export function eventsOn<T extends Dated>(events: T[], key: string): T[] {
  return events
    .filter((e) => eventOnDay(e, key))
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
}

export function tasksOn(tasks: Task[], key: string) {
  return tasks.filter((t) => t.due_date === key);
}

export function prettyDate(key: string, withWeekday = true) {
  return format(parseISO(key), withWeekday ? "M월 d일 (EEE)" : "M월 d일", { locale: ko });
}

export function relativeDue(key: string | null): { label: string; tone: "late" | "today" | "soon" | "normal" } | null {
  if (!key) return null;
  const today = todayKey();
  if (key === today) return { label: "오늘", tone: "today" };
  if (key === toKey(addDays(new Date(), 1))) return { label: "내일", tone: "soon" };
  const d = parseISO(key);
  if (isBefore(d, parseISO(today))) return { label: `${prettyDate(key, false)} 지남`, tone: "late" };
  if (isAfter(d, addDays(new Date(), 6))) return { label: prettyDate(key, false), tone: "normal" };
  return { label: format(d, "EEEE", { locale: ko }), tone: "soon" };
}

export function timeRange(e: Dated) {
  if (!e.start_time) return e.end_date && e.end_date !== e.date ? `~${prettyDate(e.end_date, false)}` : "종일";
  return e.end_time ? `${e.start_time}–${e.end_time}` : e.start_time;
}
