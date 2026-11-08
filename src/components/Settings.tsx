"use client";

import { useEffect, useState } from "react";
import { DemoBackend } from "@/lib/backend";
import { usePlanner } from "./PlannerProvider";
import { Field, inputCls } from "./ui";

const COLORS = ["#3b82f6", "#f43f5e", "#10b981", "#8b5cf6", "#f59e0b", "#0ea5e9", "#ec4899", "#64748b"];

export function Settings() {
  const { me, partner, inviteCode, backend, showToast } = usePlanner();
  const [name, setName] = useState(me?.name ?? "");

  const saveName = async () => {
    if (!name.trim() || name.trim() === me?.name) return;
    await backend.updateProfile({ name: name.trim() });
    showToast("이름을 바꿨어요");
  };

  return (
    <section aria-label="설정" className="space-y-6">
      <Card title="내 정보">
        <Field label="이름 (상대에게 보이는 이름)">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} maxLength={20} />
        </Field>
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-semibold text-ink-2">내 색깔</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`색 ${c}`}
                aria-pressed={me?.color === c}
                onClick={() => backend.updateProfile({ color: c })}
                className={`size-10 rounded-full ring-offset-2 ring-offset-surface ${me?.color === c ? "ring-2 ring-ink" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card title="함께 쓰는 사람">
        {partner ? (
          <p className="flex items-center gap-2 text-sm">
            <span className="size-3 rounded-full" style={{ background: partner.color }} />
            <b>{partner.name}</b> 님과 연결되어 있어요.
          </p>
        ) : (
          <p className="text-sm text-ink-2">아직 연결된 사람이 없어요. 아래 초대 코드를 보내 주세요.</p>
        )}
        {inviteCode && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-xs text-ink-2">초대 코드</span>
            <span className="font-mono text-lg font-bold tracking-widest">{inviteCode}</span>
            <button
              className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold ring-1 ring-line"
              onClick={() => navigator.clipboard?.writeText(inviteCode).then(() => showToast("코드를 복사했어요"))}
            >
              복사
            </button>
          </div>
        )}
      </Card>

      <PushCard />
      <InstallCard />

      {backend instanceof DemoBackend ? (
        <Card title="데모 모드">
          <p className="mb-3 text-sm text-ink-2">
            지금은 서버 없이 이 브라우저에만 저장되는 데모예요. 탭을 두 개 열고 한쪽을 아내로 바꾸면 두 사람이 쓰는 것처럼 실시간으로 확인할 수 있어요.
          </p>
          <div className="flex gap-2">
            <button onClick={() => backend.switchUser()} className="min-h-11 flex-1 rounded-xl bg-ink text-sm font-bold text-bg">
              {partner?.name}(으)로 보기
            </button>
            <button
              onClick={() => confirm("샘플 데이터로 되돌릴까요?") && backend.reset()}
              className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold"
            >
              초기화
            </button>
          </div>
        </Card>
      ) : (
        <button onClick={() => backend.signOut()} className="w-full rounded-2xl border border-line py-3 text-sm font-semibold text-ink-2">
          로그아웃
        </button>
      )}
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-line">
      <h2 className="mb-3 font-bold">{title}</h2>
      {children}
    </div>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function PushCard() {
  const { backend, showToast } = usePlanner();
  const [state, setState] = useState<"checking" | "unsupported" | "off" | "on" | "denied">("checking");
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = async () => {
    if (!vapid || backend.mode === "demo") {
      showToast("알림은 서버(Supabase)와 VAPID 키를 설정한 뒤에 쓸 수 있어요");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) });
      await backend.savePushSubscription(sub.toJSON());
      setState("on");
      showToast("알림을 켰어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "알림을 켜지 못했어요");
    }
  };

  const text = {
    checking: "확인 중…",
    unsupported: "이 브라우저는 알림을 지원하지 않아요. 아이폰은 홈 화면에 추가한 뒤 그 아이콘으로 열어 주세요.",
    off: "새 부탁을 받거나, 내 부탁이 완료되거나, 마감 당일 아침에 알려 드려요.",
    on: "이 기기에서 알림을 받고 있어요.",
    denied: "알림이 차단되어 있어요. 브라우저/휴대폰 설정에서 이 사이트의 알림을 허용해 주세요.",
  }[state];

  return (
    <Card title="알림">
      <p className="text-sm text-ink-2">{text}</p>
      {state === "off" && (
        <button onClick={enable} className="mt-3 min-h-11 w-full rounded-xl bg-accent text-sm font-bold text-accent-ink">
          이 기기에서 알림 받기
        </button>
      )}
    </Card>
  );
}

function InstallCard() {
  // 설정 화면은 로그인 후 클라이언트에서만 그려지므로 window 를 바로 읽어도 안전
  const [standalone] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as { standalone?: boolean }).standalone),
  );
  const [ios] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent));
  if (standalone) return null;
  return (
    <Card title="휴대폰에 앱처럼 설치하기">
      {ios ? (
        <p className="text-sm text-ink-2">
          Safari 아래쪽 <b>공유 버튼(⬆︎)</b> → <b>홈 화면에 추가</b>를 누르세요.
        </p>
      ) : (
        <p className="text-sm text-ink-2">
          Chrome 오른쪽 위 <b>⋮ 메뉴</b> → <b>홈 화면에 추가</b>(또는 앱 설치)를 누르세요. PC Chrome은 주소창 오른쪽 설치 아이콘을 누르면 돼요.
        </p>
      )}
    </Card>
  );
}
