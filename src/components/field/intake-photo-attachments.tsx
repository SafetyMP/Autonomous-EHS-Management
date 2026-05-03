"use client";

import { useCallback, useId, useState } from "react";
import {
  MAX_INTAKE_PHOTOS,
  compressImageForIntake,
  type CompressedIntakeImage,
} from "@/lib/field/compressIntakeImage";

export type IntakePhotoAttachmentsProps = {
  /** Current compressed images (controlled) */
  images: CompressedIntakeImage[];
  onChange: (next: CompressedIntakeImage[]) => void;
  disabled?: boolean;
  /** Shown when browser cannot compress */
  idPrefix?: string;
};

/**
 * Camera / gallery capture with client-side JPEG compression and progress messaging.
 * Does not upload — parental logic appends `dataUrl` block to description/notes or blocks offline submit.
 */
export function IntakePhotoAttachments({
  images,
  onChange,
  disabled = false,
  idPrefix,
}: IntakePhotoAttachmentsProps) {
  const reactId = useId();
  const baseId = idPrefix ?? reactId;
  const inputId = `${baseId}-camera`;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPick = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || disabled) return;
      setError(null);
      const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (incoming.length === 0) {
        setError("Choose an image file (JPEG, PNG, HEIC may not work in all browsers).");
        return;
      }
      const room = MAX_INTAKE_PHOTOS - images.length;
      if (room <= 0) {
        setError(`You can attach at most ${MAX_INTAKE_PHOTOS} photos. Remove one to add another.`);
        return;
      }
      const take = incoming.slice(0, room);
      setBusy(true);
      try {
        const next = [...images];
        for (let i = 0; i < take.length; i += 1) {
          setProgress(`Compressing photo ${i + 1} of ${take.length}…`);
          const c = await compressImageForIntake(take[i]!);
          next.push(c);
        }
        onChange(next);
        setProgress(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not process photo.");
        setProgress(null);
      } finally {
        setBusy(false);
      }
    },
    [disabled, images, onChange],
  );

  function remove(id: string) {
    onChange(images.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50/80 p-4">
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-900">
        Field photos (optional)
      </label>
      <p id={`${baseId}-hint`} className="text-xs text-zinc-700">
        Take or choose pictures — they are resized and compressed on this device, then stored with your
        text when you submit (not while offline). Max {MAX_INTAKE_PHOTOS} images.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={disabled || busy}
          className="min-h-11 w-full max-w-full text-base text-zinc-900 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-50 disabled:opacity-60"
          onChange={(e) => {
            void onPick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {busy ? (
        <p role="status" aria-live="polite" className="text-sm font-medium text-zinc-800">
          {progress ?? "Working…"}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}
      {images.length > 0 ? (
        <ul className="flex flex-wrap gap-3" role="list">
          {images.map((img) => (
            <li
              key={img.id}
              className="relative w-[5.5rem] shrink-0 rounded-md border border-zinc-300 bg-white p-1 shadow-sm"
            >
              {/* Local data URLs — next/image not applicable */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={`Preview ${img.fileName}`}
                className="h-20 w-full rounded object-cover"
              />
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => remove(img.id)}
                className="touch-target mt-1 w-full rounded border border-zinc-300 bg-white py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
