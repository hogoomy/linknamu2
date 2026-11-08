export type Profile = {
  id: string;
  name: string;
  color: string;
  couple_id: string | null;
};

export type PlannerEvent = {
  id: string;
  couple_id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD, 여러 날 일정일 때만 */
  end_date: string | null;
  /** HH:mm, null 이면 종일 */
  start_time: string | null;
  end_time: string | null;
  /** null = 함께 */
  owner_id: string | null;
  memo: string;
  created_by: string | null;
  created_at: string;
};

export type TaskStatus = "requested" | "in_progress" | "done";

export type Task = {
  id: string;
  couple_id: string;
  title: string;
  requester_id: string;
  /** null = 함께 */
  assignee_id: string | null;
  /** YYYY-MM-DD, null 이면 '언제 할까?' */
  due_date: string | null;
  status: TaskStatus;
  done_at: string | null;
  memo: string;
  created_at: string;
};

export type EventInput = Omit<PlannerEvent, "id" | "couple_id" | "created_by" | "created_at">;
export type TaskInput = Omit<Task, "id" | "couple_id" | "requester_id" | "done_at" | "created_at" | "status"> & {
  status?: TaskStatus;
};

export type Snapshot = {
  me: Profile | null;
  partner: Profile | null;
  inviteCode: string | null;
  /** 커플 커버 사진 (data URL) */
  cover: string | null;
  /** 처음 만난 날, 결혼한 날 (YYYY-MM-DD) */
  met_on: string | null;
  married_on: string | null;
  events: PlannerEvent[];
  tasks: Task[];
};

export type PushKind = "task_requested" | "task_done";

export interface Backend {
  readonly mode: "demo" | "supabase";
  /** 로그인 상태가 바뀌거나 데이터가 바뀌면 호출 */
  subscribe(listener: () => void): () => void;
  load(): Promise<Snapshot>;
  signIn(email: string): Promise<void>;
  /** 메일로 받은 숫자 코드로 로그인 (홈 화면 앱에서 필요) */
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<Pick<Profile, "name" | "color">>): Promise<void>;
  createCouple(): Promise<string>;
  setCover(dataUrl: string | null): Promise<void>;
  setAnniversaries(a: { met_on: string | null; married_on: string | null }): Promise<void>;
  joinCouple(code: string): Promise<void>;
  saveEvent(input: EventInput, id?: string): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  saveTask(input: TaskInput, id?: string): Promise<Task>;
  setTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  /** 푸시 구독 저장 */
  savePushSubscription(sub: PushSubscriptionJSON): Promise<void>;
  /** 상대에게 알림 보내기 */
  notify(kind: PushKind, taskId: string): Promise<void>;
}
