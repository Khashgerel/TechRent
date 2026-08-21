"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 6;
const MAX_EDGE = 1400;
const QUALITY = 0.82;

/**
 * Resizes in the browser before upload. Photos ride along in the form payload as
 * data URLs, so shrinking here is what keeps the request a sane size — a phone
 * photo straight off the camera would be several megabytes.
 */
async function toResizedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}

export function PhotoUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (photos: string[]) => void;
}) {
  const t = useTranslations("owner.form");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const remaining = MAX_PHOTOS - value.length;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const picked = [...files].slice(0, remaining);
      const encoded = await Promise.all(picked.map(toResizedDataUrl));
      onChange([...value, ...encoded]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {value.map((photo, index) => (
          <div
            key={photo.slice(-24) + index}
            className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] border border-ink-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-ink-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t("uploadPhotos")}
            >
              <X className="size-3.5" />
            </button>
            {index === 0 ? (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink-950/70 px-2 py-0.5 text-[10px] font-bold text-white">
                1
              </span>
            ) : null}
          </div>
        ))}

        {remaining > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-dashed border-ink-300 bg-surface-muted text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600",
              busy && "opacity-60",
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span className="text-[11px] font-bold">{t("uploadPhotos")}</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="mt-2 text-[12px] text-ink-500">{t("uploadHint")}</p>
    </div>
  );
}
