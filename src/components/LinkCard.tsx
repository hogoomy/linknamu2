type LinkCardProps = {
  title: string;
  url: string;
  emoji?: string;
  count: number; // 지금까지 눌린 횟수
  onClick?: () => void;
};

// 링크 버튼 하나 (반투명 유리 느낌의 둥근 카드)
export default function LinkCard({ title, url, emoji, count, onClick }: LinkCardProps) {
  // 이메일(mailto:) 링크는 새 탭 없이 바로 메일 프로그램을 열어요.
  const isMail = url.startsWith("mailto:");

  return (
    <a
      href={url}
      target={isMail ? undefined : "_blank"}
      rel={isMail ? undefined : "noopener noreferrer"}
      onClick={onClick}
      className="relative flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-white/70 bg-white/45 px-16 py-4 text-[15px] font-semibold text-stone-700 shadow-[0_6px_24px_-10px_rgba(160,90,50,0.3)] backdrop-blur-md transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/65 hover:shadow-[0_10px_28px_-10px_rgba(160,90,50,0.38)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a37c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdeee0]"
    >
      {emoji && (
        <span aria-hidden="true" className="text-lg leading-none">
          {emoji}
        </span>
      )}
      {title}
      {/* 카드 오른쪽 작은 글씨: 클릭 수 */}
      <span className="absolute right-4 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-stone-500 ring-1 ring-stone-200/70">
        {count.toLocaleString("ko-KR")}회
      </span>
    </a>
  );
}
