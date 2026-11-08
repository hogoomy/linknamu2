"use client";

import { useEffect, useRef, useState } from "react";
import { DemoBackend } from "@/lib/backend";
import { useGoogle } from "./GoogleProvider";
import { usePlanner } from "./PlannerProvider";
import { Card, Field, Icon, inputCls, primaryBtn, secondaryBtn } from "./ui";

// 사진에서 따온 색 (체크 셔츠 네이비·머스터드, 나무 바닥) + 기본 색. 초록은 "함께" 전용
const COLORS = ["#34508f", "#b5653a", "#8a7a2e", "#3182f6", "#f04452", "#8b5cf6", "#e07a9a", "#4e5968"];

/** 사진을 가로 900px JPEG 로 줄여 data URL 로 */
async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("사진을 읽지 못했어요"));
      i.src = url;
    });
    const scale = Math.min(1, 900 / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function Settings() {
  const { me, partner, inviteCode, cover, met_on, married_on, backend, showToast } = usePlanner();
  const [name, setName] = useState(me?.name ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveName = async () => {
    if (!name.trim() || name.trim() === me?.name) return;
    await backend.updateProfile({ name: name.trim() });
    showToast("이름을 바꿨어요");
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      await backend.setCover(await shrinkPhoto(f));
      showToast("커버 사진을 바꿨어요");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "사진을 저장하지 못했어요");
    }
  };

  return (
    <section aria-label="설정" className="space-y-3">
      <Card title="우리 사진">
        <div className="relative overflow-hidden rounded-[18px] bg-surface-2">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="커버 사진" className="aspect-[4/3] w-full object-cover object-[50%_20%]" />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-[15px] text-ink-3">아직 사진이 없어요</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => fileRef.current?.click()} className={`flex flex-1 items-center justify-center gap-1.5 ${secondaryBtn} py-3`}>
            <Icon name="camera" className="size-4" /> {cover ? "사진 바꾸기" : "사진 올리기"}
          </button>
          {cover && (
            <button onClick={() => backend.setCover(null)} className={`${secondaryBtn} py-3`}>
              지우기
            </button>
          )}
        </div>
        <input ref={fileRef} id="cover-file" type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <p className="mt-2 text-[13px] text-ink-3">두 사람 홈 화면 맨 위에 함께 보여요.</p>
      </Card>

      <Card title="우리 기념일">
        <div className="grid grid-cols-2 gap-3">
          <Field label="❤️ 처음 만난 날">
            <input
              id="met-on"
              type="date"
              className={inputCls}
              value={met_on ?? ""}
              onChange={(e) => backend.setAnniversaries({ met_on: e.target.value || null, married_on })}
            />
          </Field>
          <Field label="💍 결혼한 날">
            <input
              id="married-on"
              type="date"
              className={inputCls}
              value={married_on ?? ""}
              onChange={(e) => backend.setAnniversaries({ met_on, married_on: e.target.value || null })}
            />
          </Field>
        </div>
        <p className="mt-2 text-[13px] text-ink-3">처음 만난 날을 1일로 세요. 100일마다, 그리고 매년 기념일에 달력에 표시돼요.</p>
      </Card>

      <Card title="내 정보">
        <Field label="이름 (상대에게 보이는 이름)">
          <input id="my-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} maxLength={20} />
        </Field>
        <div className="mt-4">
          <span className="mb-2 block text-[13px] font-medium text-ink-3">내 색깔</span>
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`색 ${c}`}
                aria-pressed={me?.color === c}
                onClick={() => backend.updateProfile({ color: c })}
                className={`grid size-10 place-items-center rounded-full text-white ${me?.color === c ? "ring-[3px] ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                style={{ background: c }}
              >
                {me?.color === c && <Icon name="check" className="size-4" />}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="함께 쓰는 사람">
        {partner ? (
          <p className="flex items-center gap-2 text-[16px]">
            <span className="size-3 rounded-full" style={{ background: partner.color }} />
            <b>{partner.name}</b>님과 연결되어 있어요
          </p>
        ) : (
          <p className="text-[15px] text-ink-2">아직 연결된 사람이 없어요. 아래 초대 코드를 보내 주세요.</p>
        )}
        {inviteCode && (
          <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-surface-2 px-4 py-3.5">
            <span className="text-[13px] text-ink-3">초대 코드</span>
            <span className="flex-1 font-mono text-[20px] font-bold tracking-widest">{inviteCode}</span>
            <button
              className="rounded-[10px] bg-surface px-3 py-1.5 text-[14px] font-semibold"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(inviteCode)
                  .then(() => showToast("코드를 복사했어요"))
                  .catch(() => showToast(`초대 코드: ${inviteCode}`))
              }
            >
              복사
            </button>
          </div>
        )}
      </Card>

      <GoogleCard />
      <PushCard />
      <InstallCard />

      {backend instanceof DemoBackend ? (
        <Card title="체험 모드">
          <p className="mb-3 text-[15px] leading-relaxed text-ink-2">
            지금은 이 기기에만 저장되는 체험판이에요. 아래 버튼으로 {partner?.name} 입장이 되어 부탁을 받고 체크해 보세요.
          </p>
          <div className="flex gap-2">
            <button onClick={() => backend.switchUser()} className={`flex-1 ${primaryBtn}`}>
              {partner?.name}(으)로 보기
            </button>
            <button
              onClick={() => {
                if (!confirmReset) return setConfirmReset(true);
                backend.reset();
                setConfirmReset(false);
                showToast("예시 데이터로 되돌렸어요");
              }}
              onBlur={() => setConfirmReset(false)}
              className={`min-h-14 rounded-[16px] px-4 text-[15px] font-semibold ${confirmReset ? "bg-late text-white" : "bg-surface-2 text-ink-2"}`}
            >
              {confirmReset ? "정말 초기화" : "초기화"}
            </button>
          </div>
        </Card>
      ) : (
        <button onClick={() => backend.signOut()} className="w-full rounded-[16px] bg-surface py-4 text-[15px] font-semibold text-ink-3">
          로그아웃
        </button>
      )}
    </section>
  );
}

function GoogleCard() {
  const g = useGoogle();
  const on = g.status === "on" || g.status === "loading";
  return (
    <Card title="구글 캘린더">
      <p className="text-[15px] leading-relaxed text-ink-2">
        {on
          ? `내 구글 일정 ${g.events.length}개를 달력에 함께 보여주고 있어요.`
          : "내 구글 캘린더 일정을 달력에 회색으로 함께 보여줘요. 앱 일정은 상세 화면에서 ‘구글 캘린더에도 추가’를 누르면 돼요."}
      </p>
      {g.sample && <p className="mt-2 text-[13px] text-ink-3">체험판에서는 예시 일정으로 보여드려요. 실제 연결은 배포 후 구글 설정을 하면 돼요.</p>}
      <div className="mt-3">
        {on ? (
          <div className="flex gap-2">
            <button onClick={g.reload} className={`flex-1 ${secondaryBtn} py-3`}>
              새로고침
            </button>
            <button onClick={g.disconnect} className={`${secondaryBtn} py-3`}>
              연결 해제
            </button>
          </div>
        ) : (
          <button onClick={g.connect} className={`flex items-center justify-center gap-2 ${primaryBtn}`}>
            <Icon name="google" className="size-5" /> 구글 캘린더 연결하기
          </button>
        )}
      </div>
    </Card>
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
      showToast("알림은 실제 배포 후에 켤 수 있어요");
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
    unsupported: "이 화면에서는 알림을 쓸 수 없어요. 아이폰은 홈 화면에 추가한 앱에서 켜 주세요.",
    off: "새 부탁을 받거나, 내 부탁이 완료되거나, 마감 날 아침에 알려드려요.",
    on: "이 기기에서 알림을 받고 있어요.",
    denied: "알림이 꺼져 있어요. 휴대폰 설정에서 이 앱의 알림을 허용해 주세요.",
  }[state];

  return (
    <Card title="알림">
      <p className="text-[15px] leading-relaxed text-ink-2">{text}</p>
      {state === "off" && (
        <button onClick={enable} className={`mt-3 ${primaryBtn}`}>
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
    <Card title="홈 화면에 앱으로 추가">
      {ios ? (
        <p className="text-[15px] leading-relaxed text-ink-2">
          Safari 아래쪽 <b>공유 버튼(⬆︎)</b> → <b>홈 화면에 추가</b>를 누르세요.
        </p>
      ) : (
        <p className="text-[15px] leading-relaxed text-ink-2">
          Chrome 오른쪽 위 <b>⋮ 메뉴</b> → <b>홈 화면에 추가</b>를 누르세요. PC는 주소창 오른쪽 설치 아이콘을 누르면 돼요.
        </p>
      )}
    </Card>
  );
}
