/**
 * Client-only: resize and JPEG-compress field-captured images for intake forms.
 * Keeps total payload within typical description/notes limits when a few photos are attached.
 */

const DEFAULT_MAX_EDGE = 960;
const DEFAULT_QUALITY = 0.72;

export type CompressedIntakeImage = {
  id: string;
  fileName: string;
  dataUrl: string;
  /** Approximate decoded JPEG size from data URL length */
  byteSize: number;
};

export async function compressImageForIntake(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<CompressedIntakeImage> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const bitmap = await createImageBitmap(file);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not use canvas for photo compression.");
    }
    ctx.drawImage(bitmap, 0, 0, tw, th);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1] ?? "";
    const byteSize = Math.round((base64.length * 3) / 4);

    return {
      id: crypto.randomUUID(),
      fileName: file.name || "photo.jpg",
      dataUrl,
      byteSize,
    };
  } finally {
    bitmap.close();
  }
}

export const MAX_INTAKE_PHOTOS = 3;
/** Aligned with server zod max on incident description / observation details / inspection notes */
export const INTAKE_TEXT_MAX_LEN = 50_000;

export function buildFieldPhotoAppendix(
  images: Pick<CompressedIntakeImage, "fileName" | "dataUrl">[],
): string {
  if (images.length === 0) return "";
  const body = images
    .map(
      (p, i) =>
        `Photo ${i + 1} (${p.fileName.replace(/\s+/g, " ").slice(0, 120)}): ${p.dataUrl}`,
    )
    .join("\n");
  return `\n\n---\nField intake photos (JPEG, compressed in browser — embedded for traceability)\n${body}\n`;
}

export function wouldExceedIntakeTextLimit(
  baseText: string,
  appendix: string,
  maxTotal: number = INTAKE_TEXT_MAX_LEN,
): boolean {
  return baseText.length + appendix.length > maxTotal;
}
