import ProfileHeader from "@/components/ProfileHeader";
import LinkCard from "@/components/LinkCard";
import { profile } from "@/data/profile";

// 링크나무 메인 페이지
export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-100 px-4 py-8 dark:bg-black sm:py-12">
      <main className="flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-zinc-900 bg-white px-6 py-12 dark:border-zinc-100 dark:bg-zinc-950 sm:px-10">
        <ProfileHeader name={profile.name} bio={profile.bio} imageUrl={profile.imageUrl} />

        <ul className="mt-6 flex w-full flex-col gap-6">
          {profile.links.map((link) => (
            <li key={link.id}>
              <LinkCard title={link.title} url={link.url} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
