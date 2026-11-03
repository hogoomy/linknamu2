import { MongoClient, type Db } from "mongodb";

// MongoDB 창고와 연결하는 곳이에요. (서버에서만 쓰여요. 방문자 브라우저로는 절대 안 가요)
// 연결은 한 번만 만들어 두고 계속 재사용해요. 매번 새로 열면 느리고 접속 수가 금방 꽉 차요.

const dbName = process.env.MONGODB_DB || "linknamu";

// 연결 주소를 완성해요.
// 주소(MONGODB_URI)에는 비밀번호를 빼 두고, MONGODB_PASSWORD 값을 여기서 끼워 넣어요.
//   mongodb+srv://사용자@cluster0...  →  mongodb+srv://사용자:비밀번호@cluster0...
// 비밀번호에 특수기호가 있어도 괜찮도록 encodeURIComponent(= 주소용 글자로 바꾸기)를 써요.
function buildUri(): string | undefined {
  const base = process.env.MONGODB_URI;
  const password = process.env.MONGODB_PASSWORD;
  if (!base || !password) return base;
  return base.replace(
    /^(mongodb(?:\+srv)?:\/\/)([^:@/]+)@/,
    (_, scheme: string, user: string) => `${scheme}${user}:${encodeURIComponent(password)}@`,
  );
}

// 개발 중에는 파일을 저장할 때마다 코드가 다시 불러와져요.
// 그때마다 연결이 새로 생기지 않도록 globalThis(= 프로그램 전체가 함께 쓰는 보관함)에 넣어 둬요.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClient(): Promise<MongoClient> {
  const uri = buildUri();
  if (!uri) {
    throw new Error("MONGODB_URI가 없어요. .env.local 파일을 확인해 주세요.");
  }
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = new MongoClient(uri).connect().catch((err) => {
      // 연결에 실패하면 다음 요청 때 다시 시도할 수 있게 비워 둬요.
      globalForMongo._mongoClientPromise = undefined;
      throw err;
    });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}
