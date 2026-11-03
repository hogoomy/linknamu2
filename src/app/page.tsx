import ProfileHeader from "@/components/ProfileHeader";
import LinkList from "@/components/LinkList";
import { profile } from "@/data/profile";

// 링크나무 메인 페이지
export default function Home() {
  return (
    <div className="relative isolate flex flex-1 justify-center overflow-hidden px-6 py-16 sm:py-24">
      {/* 배경 뒤에 깔리는 흐릿한 빛 덩어리 (유리 카드가 이걸 비춰서 더 유리처럼 보여요) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-[70%] rounded-full bg-[#ffd3b0] opacity-60 blur-3xl" />
        <div className="absolute top-1/2 right-1/2 h-72 w-72 translate-x-[85%] rounded-full bg-[#ffc4c0] opacity-40 blur-3xl" />
      </div>

      <main className="flex w-full max-w-sm flex-col items-center">
        <ProfileHeader name={profile.name} bio={profile.bio} imageUrl={profile.imageUrl} />
        {/* 링크 카드 목록 (클릭 수를 받아와서 카드 오른쪽에 보여 줘요) */}
        <LinkList links={profile.links} />
      </main>
    </div>
  );
}
