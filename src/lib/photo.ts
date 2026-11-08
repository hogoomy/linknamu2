"use client";

/** 사진을 가로 최대 maxW 픽셀 JPEG data URL 로 줄이기 (저장 용량 절약) */
export async function shrinkPhoto(file: File, maxW = 900): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("사진을 읽지 못했어요 (HEIC는 '가장 호환성 높은' 형식으로 골라 주세요)"));
      i.src = url;
    });
    const scale = Math.min(1, maxW / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const monthKey = (m: number) => String(m).padStart(2, "0");
