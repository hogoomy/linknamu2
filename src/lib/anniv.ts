import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export type Anniversaries = { met_on: string | null; married_on: string | null };
export type AnnivMark = { emoji: string; label: string };

export const MET_EMOJI = "❤️";
export const WED_EMOJI = "💍";

/** 시작한 날을 1일로 세는 커플 앱 방식 (만난 날 = D+1) */
export function dayCount(start: string, key: string) {
  return differenceInCalendarDays(parseISO(key), parseISO(start)) + 1;
}

/** 그 날짜가 기념일이면 표시할 내용 */
export function annivOn(key: string, a: Anniversaries): AnnivMark[] {
  const out: AnnivMark[] = [];
  const md = key.slice(5);
  const y = Number(key.slice(0, 4));
  if (a.met_on && key >= a.met_on) {
    const n = dayCount(a.met_on, key);
    if (n % 100 === 0) out.push({ emoji: MET_EMOJI, label: `만난 지 ${n.toLocaleString()}일` });
    if (md === a.met_on.slice(5) && y > Number(a.met_on.slice(0, 4))) out.push({ emoji: MET_EMOJI, label: `만난 지 ${y - Number(a.met_on.slice(0, 4))}주년` });
  }
  if (a.married_on && key > a.married_on && md === a.married_on.slice(5)) {
    out.push({ emoji: WED_EMOJI, label: `결혼 ${y - Number(a.married_on.slice(0, 4))}주년` });
  }
  return out;
}

/** 오늘부터 가장 가까운 다음 기념일 */
export function nextAnniv(today: string, a: Anniversaries): (AnnivMark & { dday: number }) | null {
  if (!a.met_on && !a.married_on) return null;
  for (let i = 0; i <= 400; i++) {
    const key = format(addDays(parseISO(today), i), "yyyy-MM-dd");
    const marks = annivOn(key, a);
    if (marks.length) return { ...marks[0], dday: i };
  }
  return null;
}
