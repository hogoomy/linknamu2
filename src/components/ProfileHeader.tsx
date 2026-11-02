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
      {/* 흰 테두리 + 은은한 그림자로 사진이 살짝 떠 보이게 해요 */}
      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/70 ring-4 ring-white/80 shadow-[0_18px_40px_-12px_rgba(170,95,55,0.45)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${name} 프로필 사진`}
            fill
            sizes="112px"
            className="object-cover"
            priority
            // SVG 그림과 placehold.co 임시 사진(이것도 SVG예요)은 Next.js가 크기 변환을 못 해서 그대로 보여 줘요.
            unoptimized={imageUrl.endsWith(".svg") || imageUrl.startsWith("https://placehold.co/")}
          />
        ) : (
          <span className="text-4xl font-bold text-stone-400" aria-hidden="true">
            {name.charAt(0)}
          </span>
        )}
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-stone-800">{name}</h1>
      <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-stone-500">{bio}</p>
    </header>
  );
}
