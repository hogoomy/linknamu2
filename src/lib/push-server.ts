import "server-only";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 서버 환경 변수가 없어요");
  return createClient(url, key, { auth: { persistSession: false } });
}

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** 지정한 사용자들의 모든 기기에 푸시. 만료된 구독은 정리한다. */
export async function pushToUsers(userIds: string[], payload: PushPayload) {
  if (!configure() || userIds.length === 0) return 0;
  const db = adminClient();
  const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", userIds);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
  return sent;
}
