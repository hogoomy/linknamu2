"use client";

import { useEffect, useState } from "react";
import LinkCard from "@/components/LinkCard";
import type { LinkItem } from "@/data/profile";

type Counts = Record<string, number>;

// 클릭됐다는 쪽지를 서버(/api/click)에 보내요.
// sendBeacon(= 페이지를 떠나도 끝까지 배달되는 우편)을 써서, 방문자는 기다리지 않고 바로 이동해요.
function reportClick(id: string) {
  const body = JSON.stringify({ id });
  try {
    if (navigator.sendBeacon?.("/api/click", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // sendBeacon이 안 되는 브라우저면 아래 방법으로 보내요.
  }
  fetch("/api/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // 클릭 수 저장에 실패해도 링크 이동은 그대로 돼요.
  });
}

// 링크 카드 목록 + 클릭 수 관리
export default function LinkList({ links }: { links: LinkItem[] }) {
  // 처음에는 모두 0회로 보여 줘요.
  const [counts, setCounts] = useState<Counts>(() =>
    Object.fromEntries(links.map((link) => [link.id, 0])),
  );

  // 페이지가 열리면 모든 링크의 클릭 수를 한 번에 받아와요.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/click", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Counts) => {
        // 받아오는 사이에 누른 클릭이 사라지지 않게, 더 큰 값을 남겨요.
        setCounts((prev) => {
          const next = { ...prev };
          for (const [id, value] of Object.entries(data)) {
            if (typeof value === "number" && id in next) next[id] = Math.max(next[id], value);
          }
          return next;
        });
      })
      .catch(() => {
        // 못 받아오면 0회 그대로 둬요.
      });
    return () => controller.abort();
  }, []);

  function handleClick(id: string) {
    reportClick(id);
    // 화면 숫자도 바로 1 올려요.
    setCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  return (
    <ul className="mt-10 flex w-full flex-col gap-4">
      {links.map((link) => (
        <li key={link.id}>
          <LinkCard
            title={link.title}
            url={link.url}
            emoji={link.emoji}
            count={counts[link.id] ?? 0}
            onClick={() => handleClick(link.id)}
          />
        </li>
      ))}
    </ul>
  );
}
