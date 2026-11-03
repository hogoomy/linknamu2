import { connection } from "next/server";
import { getDb } from "@/lib/mongodb";
import { profile } from "@/data/profile";

// 링크 클릭 수를 세는 접수 창구예요.
// - POST /api/click  : { "id": "github" } 쪽지를 받으면 그 링크 숫자를 1 올려요.
// - GET  /api/click  : 지금까지 쌓인 클릭 수를 보여 줘요. (확인용)

type ClickDoc = { _id: string; count: number; updatedAt: Date };

// profile.ts에 있는 링크 이름만 받아요. 엉뚱한 이름은 거절해요.
const allowedIds = new Set(profile.links.map((link) => link.id));

async function clicks() {
  const db = await getDb();
  return db.collection<ClickDoc>("clicks");
}

export async function POST(request: Request) {
  let id: unknown;
  try {
    ({ id } = await request.json());
  } catch {
    return Response.json({ error: "쪽지 내용을 읽을 수 없어요" }, { status: 400 });
  }

  if (typeof id !== "string" || !allowedIds.has(id)) {
    return Response.json({ error: "없는 링크예요" }, { status: 400 });
  }

  try {
    const result = await (await clicks()).findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    return Response.json({ id, count: result?.count ?? 1 });
  } catch (err) {
    console.error("[click] 저장 실패:", err);
    return Response.json({ error: "저장하지 못했어요" }, { status: 500 });
  }
}

export async function GET() {
  // 매번 창고에서 새로 읽어요. (미리 만들어 둔 옛날 숫자를 보여 주지 않게)
  await connection();

  try {
    const docs = await (await clicks()).find().toArray();
    const counts = Object.fromEntries(profile.links.map((link) => [link.id, 0]));
    for (const doc of docs) counts[doc._id] = doc.count;
    return Response.json(counts);
  } catch (err) {
    console.error("[click] 읽기 실패:", err);
    return Response.json({ error: "읽지 못했어요" }, { status: 500 });
  }
}
