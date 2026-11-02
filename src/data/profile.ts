// 링크나무 페이지에 보여 줄 내용이에요.
// 이름, 소개, 링크를 바꾸고 싶으면 이 파일만 고치면 돼요.

export type LinkItem = {
  id: string; // 링크마다 다른 이름표 (나중에 클릭 수를 셀 때 써요)
  title: string; // 버튼에 보이는 글자
  url: string; // 눌렀을 때 이동할 주소
  emoji?: string; // 글자 앞에 붙는 그림 문자 (없어도 돼요)
};

export type Profile = {
  name: string;
  bio: string;
  imageUrl?: string; // 프로필 사진 주소 (없으면 이름 첫 글자를 보여 줘요)
  links: LinkItem[];
};

// ⚠️ 아래 값은 모두 보여 주기용 더미(가짜) 값이에요. 나중에 진짜 내용으로 바꿔 주세요.
export const profile: Profile = {
  name: "김호겸",
  bio: "풀스택 개발자, 요즘에는 AI 개발에 관심이 많아요",
  // 지금은 임시 사진이에요. 진짜 사진은 public 폴더에 넣고 주소를 바꿔 주세요. 예: "/profile.jpg"
  imageUrl: "https://placehold.co/150x150/orange/white",
  links: [
    { id: "github", title: "깃허브", url: "https://github.com/hogoomy", emoji: "🐙" },
    // 블로그는 아직 임시 주소예요. 블로그를 만들면 주소를 바꿔 주세요.
    { id: "blog", title: "블로그", url: "https://example.com", emoji: "✍️" },
    { id: "email", title: "이메일", url: "mailto:hogoomy@gmail.com", emoji: "📬" },
  ],
};
