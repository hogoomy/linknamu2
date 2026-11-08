import { adminClient, pushToUsers } from "@/lib/push-server";

/** 매일 아침(08:00 KST) Vercel Cron 이 호출: 오늘 마감인 할 일을 담당자에게 알림 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()); // YYYY-MM-DD
  const db = adminClient();
  const { data: tasks, error } = await db.from("tasks").select("id,title,couple_id,assignee_id").eq("due_date", today).neq("status", "done");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 사용자별로 오늘 할 일 모으기 (함께 = 커플 두 사람 모두)
  const perUser = new Map<string, string[]>();
  const add = (uid: string, title: string) => perUser.set(uid, [...(perUser.get(uid) ?? []), title]);
  const togetherCouples = [...new Set((tasks ?? []).filter((t) => !t.assignee_id).map((t) => t.couple_id))];
  const { data: members } = togetherCouples.length
    ? await db.from("profiles").select("id,couple_id").in("couple_id", togetherCouples)
    : { data: [] as { id: string; couple_id: string }[] };

  for (const t of tasks ?? []) {
    if (t.assignee_id) add(t.assignee_id, t.title);
    else (members ?? []).filter((m) => m.couple_id === t.couple_id).forEach((m) => add(m.id, t.title));
  }

  let sent = 0;
  for (const [uid, titles] of perUser) {
    sent += await pushToUsers([uid], {
      title: `오늘 할 일 ${titles.length}개`,
      body: titles.slice(0, 3).join(", ") + (titles.length > 3 ? ` 외 ${titles.length - 3}개` : ""),
      url: "/",
      tag: `daily-${today}`,
    });
  }
  return Response.json({ ok: true, users: perUser.size, sent });
}
