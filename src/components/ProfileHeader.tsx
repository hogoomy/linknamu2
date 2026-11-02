import Image from "next/image";

type ProfileHeaderProps = {
  name: string;
  bio: string;
  imageUrl?: string;
};

// 동그란 프로필 사진 + 이름 + 한 줄 소개
export default function ProfileHeader({ name, bio, imageUrl }: ProfileHeaderProps) {
  return (
    <header className="flex flex-col items-center text-center">
      <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${name} 프로필 사진`}
            fill
            sizes="144px"
            className="object-cover"
            priority
            // SVG 그림은 Next.js가 크기 변환을 하지 않아서 그대로 보여 줘요.
            unoptimized={imageUrl.endsWith(".svg")}
          />
        ) : (
          <span className="text-4xl font-bold text-zinc-500" aria-hidden="true">
            {name.charAt(0)}
          </span>
        )}
      </div>

      <h1 className="mt-6 text-sm font-medium text-zinc-700 dark:text-zinc-300">{name}</h1>
      <p className="mt-4 text-lg font-semibold">{bio}</p>
    </header>
  );
}
