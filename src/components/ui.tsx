"use client";

import { useEffect } from "react";

type IconName = "chevron" | "camera" | "google" | "calendar" | "check" | "settings" | "plus" | "left" | "right" | "close" | "trash" | "clock" | "inbox" | "send" | "heart";

const paths: Record<IconName, React.ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  google: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9.5h17M8 2.5v4M16 2.5v4M10 15.5h4" />
    </>
  ),
  left: <path d="M15 18l-6-6 6-6" />,
  right: <path d="M9 18l6-6-6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  inbox: <path d="M4 13l2.5-7h11L20 13v6H4zM4 13h5l1 2h4l1-2h5" />,
  send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
};

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}

/** 모바일: 아래에서 올라오는 시트 / PC: 가운데 대화상자 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <button aria-label="닫기" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="animate-sheet relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-surface pb-safe sm:max-w-md sm:rounded-[28px]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-6 pt-4 pb-3">
          <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="-mr-2 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2" aria-label="닫기">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={`flex rounded-[14px] bg-surface-2 p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 flex-1 rounded-[10px] px-3 text-[15px] font-semibold transition ${
            value === o.value ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-ink-3"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-ink-3">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-[14px] border-2 border-transparent bg-surface-2 px-4 py-3.5 text-[17px] text-ink outline-none placeholder:text-ink-3 focus:border-accent";

/** 토스풍 흰 카드 */
export function Card({ children, className = "", title, action }: { children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className={`rounded-[24px] bg-surface px-5 py-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const primaryBtn = "min-h-14 w-full rounded-[16px] bg-accent text-[17px] font-semibold text-accent-ink transition active:scale-[0.98] disabled:opacity-40";
export const secondaryBtn = "rounded-[12px] bg-surface-2 px-3.5 py-2 text-[15px] font-semibold text-ink-2 transition active:scale-[0.97]";
export const softBtn = "rounded-[12px] bg-accent-soft px-3.5 py-2 text-[15px] font-semibold text-accent transition active:scale-[0.97]";

export function PersonChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[12px] font-semibold" style={{ background: `${color}1f`, color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}
