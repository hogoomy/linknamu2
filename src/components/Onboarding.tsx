"use client";

import { useState } from "react";
import { usePlanner } from "./PlannerProvider";
import { Field, Icon, inputCls, Segmented } from "./ui";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-accent text-accent-ink">
          <Icon name="heart" className="size-8" />
        </div>
        <h1 className="text-2xl font-bold">우리집 플래너</h1>
        <p className="mt-1 text-sm text-ink-2">둘이 함께 쓰는 달력과 할 일</p>
      </div>
      {children}
    </main>
  );
}

export function SignIn() {
  const { backend, showToast } = usePlanner();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await backend.verifyCode(email.trim(), code);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "로그인하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await backend.signIn(email.trim());
      setSent(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "메일을 보내지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      {sent ? (
        <form onSubmit={verify} className="space-y-3 rounded-3xl bg-surface p-6 text-center ring-1 ring-line">
          <p className="font-bold">메일함을 확인해 주세요</p>
          <p className="text-sm text-ink-2">
            <b>{email}</b> 로 보낸 메일의 <b>숫자 코드</b>를 입력하세요. (홈 화면 앱에서는 링크 대신 코드를 쓰는 게 확실해요)
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="로그인 코드"
            className={`${inputCls} text-center font-mono text-2xl tracking-[0.3em]`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            maxLength={8}
            minLength={6}
            required
          />
          <button disabled={busy} className="min-h-12 w-full rounded-2xl bg-accent font-bold text-accent-ink disabled:opacity-50">
            {busy ? "확인 중…" : "로그인"}
          </button>
          <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-accent">
            다른 메일로 받기
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="이메일">
            <input type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <button disabled={busy} className="min-h-12 w-full rounded-2xl bg-accent font-bold text-accent-ink disabled:opacity-50">
            {busy ? "보내는 중…" : "로그인 링크 받기"}
          </button>
          <p className="text-center text-xs text-ink-3">비밀번호 없이 메일로 받은 코드로 로그인해요.</p>
        </form>
      )}
    </Shell>
  );
}

export function CoupleSetup() {
  const { backend, showToast, me } = usePlanner();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [code, setCode] = useState("");
  const [name, setName] = useState(me?.name ?? "");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      if (name.trim() && name.trim() !== me?.name) await backend.updateProfile({ name: name.trim() });
      await fn();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "문제가 생겼어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-line">
        <Field label="내 이름 (상대에게 보여요)">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 남편, 호겸" maxLength={20} />
        </Field>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "create", label: "처음 시작해요" },
            { value: "join", label: "초대 코드가 있어요" },
          ]}
        />
        {mode === "create" ? (
          <>
            <p className="text-sm text-ink-2">우리 둘만의 공간을 만들고, 나오는 초대 코드를 배우자에게 보내 주세요.</p>
            <button disabled={busy} onClick={() => run(() => backend.createCouple())} className="min-h-12 w-full rounded-2xl bg-accent font-bold text-accent-ink disabled:opacity-50">
              공간 만들기
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => backend.joinCouple(code));
            }}
            className="space-y-3"
          >
            <Field label="초대 코드 6자리">
              <input
                className={`${inputCls} text-center font-mono text-xl tracking-[0.4em] uppercase`}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
              />
            </Field>
            <button disabled={busy} className="min-h-12 w-full rounded-2xl bg-accent font-bold text-accent-ink disabled:opacity-50">
              연결하기
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}
