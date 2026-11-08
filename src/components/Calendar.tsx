"use client";

import { addMonths, format, isSameMonth, parseISO } from "date-fns";
import { useRef } from "react";
import { annivOn, dayCount, MET_EMOJI, nextAnniv, WED_EMOJI } from "@/lib/anniv";
import { eventsOn, monthGrid, tasksOn, todayKey, toKey } from "@/lib/dates";
import { monthKey, shrinkPhoto } from "@/lib/photo";
import { GOOGLE_COLOR, useGoogle } from "./GoogleProvider";
import { usePlanner } from "./PlannerProvider";
import { Icon } from "./ui";

const EN_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * 사진 달력: 위에 그 달 사진(없으면 기본 커플 사진), 아래 왼쪽 큰 손글씨 월, 오른쪽 날짜판.
 * 좌우로 밀면 달이 바뀌고, 날짜를 누르면 onPick.
 */
export function Calendar({
  selected,
  onSelect,
  onPick,
}: {
  selected: string;
  /** 달 이동 (팝업 없이 선택만 바꿈) */
  onSelect: (key: string) => void;
  /** 날짜를 눌렀을 때 (그 날 팝업 열기) */
  onPick: (key: string) => void;
}) {
  const { me, partner, events, tasks, colorOf, met_on, married_on, cover, monthPhotos, backend, showToast } = usePlanner();
  const google = useGoogle();
  const sel = parseISO(selected);
  const days = monthGrid(sel);
  const today = todayKey();
  const mk = monthKey(sel.getMonth() + 1);
  const photo = monthPhotos[mk] ?? cover;
  const fileRef = useRef<HTMLInputElement>(null);
  const touchX = useRef<number | null>(null);

  const move = (dir: 1 | -1) => onSelect(toKey(addMonths(sel, dir)));

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      await backend.setMonthPhoto(mk, await shrinkPhoto(f));
      showToast(`${sel.getMonth() + 1}월 사진을 바꿨어요`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "사진을 저장하지 못했어요");
    }
  };

  const ddays = [
    met_on && { emoji: MET_EMOJI, label: "처음 만난 날", n: dayCount(met_on, today) },
    married_on && { emoji: WED_EMOJI, label: "결혼", n: dayCount(married_on, today) },
  ].filter((d): d is { emoji: string; label: string; n: number } => !!d && d.n > 0);
  const next = nextAnniv(today, { met_on, married_on });

  return (
    <section
      aria-label="달력"
      className="overflow-hidden rounded-[24px] bg-surface"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 60) move(dx < 0 ? 1 : -1);
      }}
    >
      {/* 이 달의 사진 */}
      <div className="relative">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={`${sel.getMonth() + 1}월 사진`} className="h-[260px] w-full object-cover object-[50%_20%] sm:h-[340px]" draggable={false} />
        ) : (
          <button onClick={() => fileRef.current?.click()} className="grid h-[200px] w-full place-items-center bg-surface-2 text-[15px] font-medium text-ink-3">
            <span className="flex flex-col items-center gap-2">
              <Icon name="camera" className="size-7" />
              {sel.getMonth() + 1}월 사진 올리기
            </span>
          </button>
        )}
        {photo && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" aria-hidden />
            {ddays.length > 0 && (
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                {ddays.map((d) => (
                  <span
                    key={d.label}
                    title={`${d.label}부터 ${d.n.toLocaleString()}일째`}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[13px] font-bold text-white tabular-nums backdrop-blur-md"
                  >
                    <span aria-label={d.label}>{d.emoji}</span> D+{d.n.toLocaleString()}
                  </span>
                ))}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
              <div className="min-w-0">
                <p className="text-[22px] leading-tight font-bold tracking-tight drop-shadow">
                  {me?.name}
                  {partner && <span className="opacity-70"> ♥ </span>}
                  {partner?.name}
                </p>
                {next && (
                  <p className="mt-0.5 text-[13px] font-medium text-white/85 drop-shadow">
                    {next.emoji} {next.label}
                    {next.dday === 0 ? " · 오늘이에요!" : `까지 D-${next.dday}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md"
                aria-label={`${sel.getMonth() + 1}월 사진 바꾸기`}
              >
                <Icon name="camera" className="size-5" />
              </button>
            </div>
          </>
        )}
        <input ref={fileRef} id="month-photo" type="file" accept="image/*" className="hidden" onChange={onPhoto} />
      </div>

      {/* 손글씨 월 + 날짜판 */}
      <div className="flex gap-2 px-3 pt-4 pb-3 sm:gap-4 sm:px-5">
        <div className="flex w-[64px] shrink-0 flex-col font-hand sm:w-[88px]">
          <span className="text-[56px] leading-[0.9] font-bold tabular-nums sm:text-[72px]">{sel.getMonth() + 1}</span>
          <span className="mt-2 text-[20px] leading-none">{EN_MONTH[sel.getMonth()]}</span>
          <span className="mt-1 text-[17px] leading-none text-ink-3">{sel.getFullYear()}</span>
          <div className="mt-3 flex gap-0.5 font-sans">
            <button onClick={() => move(-1)} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2" aria-label="이전 달">
              <Icon name="left" className="size-4" />
            </button>
            <button onClick={() => move(1)} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2" aria-label="다음 달">
              <Icon name="right" className="size-4" />
            </button>
          </div>
          {!isSameMonth(sel, parseISO(today)) && (
            <button onClick={() => onSelect(today)} className="mt-1 self-start rounded-[8px] bg-accent-soft px-2 py-0.5 font-sans text-[12px] font-semibold text-accent">
              오늘
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-7 text-center font-hand text-[15px] text-ink-3">
            {EN_DAYS.map((w, i) => (
              <div key={w} className={`pb-1.5 ${i === 0 ? "text-late" : ""}`}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = toKey(d);
              if (!isSameMonth(d, sel)) return <span key={key} aria-hidden className="min-h-[46px]" />;
              const dots = [
                ...eventsOn(events, key).map((e) => ({ id: e.id, color: colorOf(e.owner_id) })),
                ...eventsOn(google.events, key).map((e) => ({ id: `g-${e.id}`, color: GOOGLE_COLOR })),
              ];
              const open = tasksOn(tasks, key).filter((t) => t.status !== "done").length;
              const anniv = annivOn(key, { met_on, married_on });
              const isSel = key === selected;
              const isToday = key === today;
              return (
                <button
                  key={key}
                  onClick={() => onPick(key)}
                  aria-label={`${format(d, "M월 d일")} 일정 ${dots.length}개, 할 일 ${open}개${anniv.length ? `, ${anniv.map((a) => a.label).join(", ")}` : ""}`}
                  aria-pressed={isSel}
                  className="flex min-h-[46px] flex-col items-center gap-[3px] rounded-[12px] pt-0.5 transition hover:bg-surface-2 active:scale-95"
                >
                  <span
                    className={`relative grid size-[30px] place-items-center rounded-full font-hand text-[19px] leading-none tabular-nums ${
                      isToday ? "bg-accent font-bold text-accent-ink" : isSel ? "ring-2 ring-accent" : d.getDay() === 0 ? "text-late" : ""
                    }`}
                  >
                    {d.getDate()}
                    {anniv.length > 0 && <span className="absolute -top-1.5 -right-1.5 font-sans text-[11px]">{anniv[0].emoji}</span>}
                  </span>
                  <span className="flex h-1.5 items-center gap-[3px]" aria-hidden>
                    {dots.slice(0, 3).map((m) => (
                      <span key={m.id} className="size-[5px] rounded-full" style={{ background: m.color }} />
                    ))}
                    {open > 0 && <span className="size-[5px] rounded-[1.5px] bg-accent" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {google.status === "needs-auth" && (
        <div className="px-3 pb-3 sm:px-5">
          <button onClick={google.connect} className="flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-surface-2 py-2.5 text-[14px] font-semibold text-ink-2">
            <Icon name="google" className="size-4" /> 구글 일정 다시 불러오기
          </button>
        </div>
      )}
    </section>
  );
}
