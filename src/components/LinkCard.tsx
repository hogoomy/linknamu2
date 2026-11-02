type LinkCardProps = {
  title: string;
  url: string;
};

// 링크 버튼 하나 (둥근 네모 모양)
export default function LinkCard({ title, url }: LinkCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-zinc-900 bg-white px-4 py-3 text-base font-medium transition hover:-translate-y-0.5 hover:bg-zinc-50 active:translate-y-0 dark:border-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      {title}
    </a>
  );
}
