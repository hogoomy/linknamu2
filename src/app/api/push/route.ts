import { adminClient, pushToUsers } from "@/lib/push-server";

/**
 * 클라이언트가 할 일을 부탁/완료한 직후 호출.
 * 호출자 토큰을 검증하고, 같은 커플 공간의 할 일인지 확인한 뒤 상대에게만 알림을 보낸다.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { kind?: string; taskId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.taskId || (body.kind !== "task_requested" && body.kind !== "task_done")) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  let db;
  try {
    db = adminClient();
  } catch {
    return Response.json({ ok: false, reason: "not configured" });
  }

  const { data: auth } = await db.auth.getUser(token);
  const user = auth.user;
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: me }, { data: task }] = await Promise.all([
    db.from("profiles").select("id,name,couple_id").eq("id", user.id).single(),
    db.from("tasks").select("*").eq("id", body.taskId).single(),
  ]);
  if (!me || !task || task.couple_id !== me.couple_id) return Response.json({ error: "not found" }, { status: 404 });

  const who = me.name || "상대";
  let target: string | null = null;
  let payload;
  if (body.kind === "task_requested") {
    if (task.requester_id !== me.id || !task.assignee_id || task.assignee_id === me.id) return Response.json({ ok: true, sent: 0 });
    target = task.assignee_id;
    payload = { title: `${who}의 부탁`, body: task.title, url: "/", tag: `task-${task.id}` };
  } else {
    if (task.status !== "done" || task.requester_id === me.id) return Response.json({ ok: true, sent: 0 });
    target = task.requester_id;
    payload = { title: `${who}이(가) 완료했어요 ✓`, body: task.title, url: "/", tag: `task-${task.id}` };
  }

  const sent = await pushToUsers([target!], payload);
  return Response.json({ ok: true, sent });
}
