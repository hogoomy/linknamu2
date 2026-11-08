import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Backend, EventInput, PlannerEvent, Profile, PushKind, Snapshot, Task, TaskInput, TaskStatus } from "../types";

const trimTime = (t: string | null) => (t ? t.slice(0, 5) : null);

export class SupabaseBackend implements Backend {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient;
  private listeners = new Set<() => void>();
  private channel: RealtimeChannel | null = null;
  private channelCouple: string | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    this.sb.auth.onAuthStateChange(() => this.emit());
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 커플 공간의 변경을 실시간 구독 */
  private watch(coupleId: string | null) {
    if (this.channelCouple === coupleId) return;
    if (this.channel) void this.sb.removeChannel(this.channel);
    this.channel = null;
    this.channelCouple = coupleId;
    if (!coupleId) return;
    const filter = `couple_id=eq.${coupleId}`;
    this.channel = this.sb
      .channel(`couple:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter }, () => this.emit())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter }, () => this.emit())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter }, () => this.emit())
      .on("postgres_changes", { event: "*", schema: "public", table: "couples", filter: `id=eq.${coupleId}` }, () => this.emit())
      .subscribe();
  }

  private async userId(): Promise<string> {
    const { data } = await this.sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("로그인이 필요해요");
    return id;
  }

  async load(): Promise<Snapshot> {
    const { data: sess } = await this.sb.auth.getSession();
    const user = sess.session?.user;
    if (!user) {
      this.watch(null);
      return { me: null, partner: null, inviteCode: null, cover: null, events: [], tasks: [] };
    }
    const { data: profiles, error } = await this.sb.from("profiles").select("id,name,color,couple_id");
    if (error) throw error;
    const me = (profiles as Profile[]).find((p) => p.id === user.id) ?? {
      id: user.id,
      name: user.email?.split("@")[0] ?? "",
      color: "#f97362",
      couple_id: null,
    };
    const partner = (profiles as Profile[]).find((p) => p.id !== user.id) ?? null;
    this.watch(me.couple_id);
    if (!me.couple_id) return { me, partner: null, inviteCode: null, cover: null, events: [], tasks: [] };

    const [couple, events, tasks] = await Promise.all([
      this.sb.from("couples").select("invite_code,cover_photo").eq("id", me.couple_id).maybeSingle(),
      this.sb.from("events").select("*").order("date"),
      this.sb.from("tasks").select("*").order("created_at"),
    ]);
    if (events.error) throw events.error;
    if (tasks.error) throw tasks.error;
    return {
      me,
      partner,
      inviteCode: couple.data?.invite_code ?? null,
      cover: couple.data?.cover_photo ?? null,
      events: (events.data as PlannerEvent[]).map((e) => ({
        ...e,
        start_time: trimTime(e.start_time),
        end_time: trimTime(e.end_time),
      })),
      tasks: tasks.data as Task[],
    };
  }

  async signIn(email: string) {
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async verifyCode(email: string, code: string) {
    const { error } = await this.sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) throw new Error("코드가 맞지 않거나 만료됐어요. 새 코드를 받아 주세요");
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async updateProfile(patch: Partial<Pick<Profile, "name" | "color">>) {
    const id = await this.userId();
    const { error } = await this.sb.from("profiles").update(patch).eq("id", id);
    if (error) throw error;
    this.emit();
  }

  async createCouple() {
    const { data, error } = await this.sb.rpc("create_couple");
    if (error) throw error;
    this.emit();
    return data as string;
  }

  async setCover(dataUrl: string | null) {
    const { error } = await this.sb.from("couples").update({ cover_photo: dataUrl }).eq("id", await this.coupleId());
    if (error) throw error;
    this.emit();
  }

  async joinCouple(code: string) {
    const { error } = await this.sb.rpc("join_couple", { p_code: code });
    if (error) throw error;
    this.emit();
  }

  private async coupleId(): Promise<string> {
    const id = await this.userId();
    const { data, error } = await this.sb.from("profiles").select("couple_id").eq("id", id).single();
    if (error || !data?.couple_id) throw new Error("커플 공간이 없어요");
    return data.couple_id as string;
  }

  async saveEvent(input: EventInput, id?: string) {
    const q = id
      ? this.sb.from("events").update(input).eq("id", id)
      : this.sb.from("events").insert({ ...input, couple_id: await this.coupleId(), created_by: await this.userId() });
    const { error } = await q;
    if (error) throw error;
    this.emit();
  }

  async deleteEvent(id: string) {
    const { error } = await this.sb.from("events").delete().eq("id", id);
    if (error) throw error;
    this.emit();
  }

  async saveTask(input: TaskInput, id?: string) {
    const q = id
      ? this.sb.from("tasks").update(input).eq("id", id).select().single()
      : this.sb
          .from("tasks")
          .insert({ ...input, couple_id: await this.coupleId(), requester_id: await this.userId() })
          .select()
          .single();
    const { data, error } = await q;
    if (error) throw error;
    this.emit();
    return data as Task;
  }

  async setTaskStatus(id: string, status: TaskStatus) {
    const { data, error } = await this.sb
      .from("tasks")
      .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    this.emit();
    return data as Task;
  }

  async deleteTask(id: string) {
    const { error } = await this.sb.from("tasks").delete().eq("id", id);
    if (error) throw error;
    this.emit();
  }

  async savePushSubscription(sub: PushSubscriptionJSON) {
    const user_id = await this.userId();
    const { error } = await this.sb.from("push_subscriptions").upsert(
      { user_id, endpoint: sub.endpoint, p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
  }

  async notify(kind: PushKind, taskId: string) {
    const { data } = await this.sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    // 알림 실패가 할 일 저장을 막지 않도록 결과는 무시
    await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, taskId }),
    }).catch(() => undefined);
  }
}
