import { addDays, format } from "date-fns";
import type { Backend, EventInput, PlannerEvent, Profile, Snapshot, Task, TaskInput, TaskStatus } from "../types";

/**
 * Supabase 설정 전에도 바로 써볼 수 있는 데모 백엔드.
 * 데이터는 이 브라우저 localStorage 에만 저장되고, 같은 브라우저의 다른 탭과는 실시간으로 동기화된다.
 * 탭마다 '누구로 보기'(남편/아내)를 바꿔서 두 사람 흐름을 시험할 수 있다.
 */

const DB_KEY = "couple-planner-demo-v2";
const ME_KEY = "couple-planner-demo-me";
const COUPLE_ID = "demo-couple";

type DemoDB = { profiles: Profile[]; events: PlannerEvent[]; tasks: Task[]; cover?: string | null };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function seed(): DemoDB {
  const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
  const now = new Date().toISOString();
  const H = "demo-husband";
  const W = "demo-wife";
  return {
    profiles: [
      { id: H, name: "남편", color: "#34508f", couple_id: COUPLE_ID },
      { id: W, name: "아내", color: "#b5653a", couple_id: COUPLE_ID },
    ],
    events: [
      { id: uid(), couple_id: COUPLE_ID, title: "장모님 생신 저녁", date: d(3), end_date: null, start_time: "18:30", end_time: "21:00", owner_id: null, memo: "케이크 픽업", created_by: W, created_at: now },
      { id: uid(), couple_id: COUPLE_ID, title: "회사 워크숍", date: d(6), end_date: d(7), start_time: null, end_time: null, owner_id: H, memo: "", created_by: H, created_at: now },
      { id: uid(), couple_id: COUPLE_ID, title: "필라테스", date: d(1), end_date: null, start_time: "19:00", end_time: "20:00", owner_id: W, memo: "", created_by: W, created_at: now },
    ],
    tasks: [
      { id: uid(), couple_id: COUPLE_ID, title: "세탁소에서 코트 찾아오기", requester_id: W, assignee_id: H, due_date: d(2), status: "requested", done_at: null, memo: "영수증은 현관 서랍", created_at: now },
      { id: uid(), couple_id: COUPLE_ID, title: "자동차 보험 갱신 확인", requester_id: H, assignee_id: W, due_date: d(5), status: "in_progress", done_at: null, memo: "", created_at: now },
      { id: uid(), couple_id: COUPLE_ID, title: "주말 장보기 목록 정하기", requester_id: H, assignee_id: null, due_date: d(0), status: "requested", done_at: null, memo: "", created_at: now },
      { id: uid(), couple_id: COUPLE_ID, title: "거실 커튼 새로 고르기", requester_id: W, assignee_id: null, due_date: null, status: "requested", done_at: null, memo: "", created_at: now },
    ],
  };
}

export class DemoBackend implements Backend {
  readonly mode = "demo" as const;
  private listeners = new Set<() => void>();
  /** 브라우저 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리에만 보관 */
  private mem: DemoDB | null = null;
  private memMe: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === DB_KEY) this.emit();
      });
    }
  }

  private read(): DemoDB {
    const raw = safeGet("localStorage", DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DemoDB;
      } catch {
        /* fallthrough → reseed */
      }
    }
    if (this.mem) return structuredClone(this.mem);
    const db = seed();
    this.mem = db;
    safeSet("localStorage", DB_KEY, JSON.stringify(db));
    return structuredClone(db);
  }

  private write(db: DemoDB) {
    this.mem = db;
    safeSet("localStorage", DB_KEY, JSON.stringify(db));
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private meId(): string {
    return safeGet("sessionStorage", ME_KEY) ?? this.memMe ?? "demo-husband";
  }

  /** 데모 전용: 이 탭에서 누구로 볼지 전환 */
  switchUser() {
    this.memMe = this.meId() === "demo-husband" ? "demo-wife" : "demo-husband";
    safeSet("sessionStorage", ME_KEY, this.memMe);
    this.emit();
  }

  /** 데모 전용: 샘플 데이터로 초기화 */
  reset() {
    this.write(seed());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async load(): Promise<Snapshot> {
    const db = this.read();
    const me = db.profiles.find((p) => p.id === this.meId()) ?? null;
    const partner = db.profiles.find((p) => p.id !== this.meId()) ?? null;
    return { me, partner, inviteCode: "DEMO42", cover: db.cover ?? null, events: db.events, tasks: db.tasks };
  }

  async signIn() {}
  async verifyCode() {}
  async signOut() {}

  async updateProfile(patch: Partial<Pick<Profile, "name" | "color">>) {
    const db = this.read();
    db.profiles = db.profiles.map((p) => (p.id === this.meId() ? { ...p, ...patch } : p));
    this.write(db);
  }

  async setCover(dataUrl: string | null) {
    const db = this.read();
    db.cover = dataUrl;
    this.write(db);
  }

  async createCouple() {
    return "DEMO42";
  }
  async joinCouple() {}

  async saveEvent(input: EventInput, id?: string) {
    const db = this.read();
    if (id) {
      db.events = db.events.map((e) => (e.id === id ? { ...e, ...input } : e));
    } else {
      db.events.push({ ...input, id: uid(), couple_id: COUPLE_ID, created_by: this.meId(), created_at: new Date().toISOString() });
    }
    this.write(db);
  }

  async deleteEvent(id: string) {
    const db = this.read();
    db.events = db.events.filter((e) => e.id !== id);
    this.write(db);
  }

  async saveTask(input: TaskInput, id?: string) {
    const db = this.read();
    let saved: Task;
    if (id) {
      const prev = db.tasks.find((t) => t.id === id)!;
      saved = { ...prev, ...input, status: input.status ?? prev.status };
      db.tasks = db.tasks.map((t) => (t.id === id ? saved : t));
    } else {
      saved = {
        ...input,
        id: uid(),
        couple_id: COUPLE_ID,
        requester_id: this.meId(),
        status: input.status ?? "requested",
        done_at: null,
        created_at: new Date().toISOString(),
      };
      db.tasks.push(saved);
    }
    this.write(db);
    return saved;
  }

  async setTaskStatus(id: string, status: TaskStatus) {
    const db = this.read();
    let saved!: Task;
    db.tasks = db.tasks.map((t) => {
      if (t.id !== id) return t;
      saved = { ...t, status, done_at: status === "done" ? new Date().toISOString() : null };
      return saved;
    });
    this.write(db);
    return saved;
  }

  async deleteTask(id: string) {
    const db = this.read();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    this.write(db);
  }

  async savePushSubscription() {}
  async notify() {}
}

type StoreName = "localStorage" | "sessionStorage";
// window.localStorage 접근 자체가 예외를 던지는 환경이 있어서 접근까지 try 안에서
function safeGet(store: StoreName, key: string): string | null {
  try {
    return window[store].getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: StoreName, key: string, value: string) {
  try {
    window[store].setItem(key, value);
  } catch {
    /* 저장 불가 환경(사생활 보호 모드 등)은 무시 */
  }
}
