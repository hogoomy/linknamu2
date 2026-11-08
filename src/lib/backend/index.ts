import type { Backend } from "../types";
import { DemoBackend } from "./demo";
import { SupabaseBackend } from "./supabase";

let instance: Backend | null = null;

/** Supabase 환경 변수가 있으면 실제 서버, 없으면 데모(브라우저 저장) 모드 */
export function getBackend(): Backend {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  instance = url && key ? new SupabaseBackend(url, key) : new DemoBackend();
  return instance;
}

export { DemoBackend };
