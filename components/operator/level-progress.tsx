import { useTranslations } from "next-intl";
import { SEQUENTIAL } from "@/lib/chart-palette";

/**
 * Progress toward the next operator level. The decks make levelling the core of
 * the operator's story, so the gap to the next tier is stated in points rather
 * than left implicit in a bar.
 */
export function LevelProgress({
  level,
  points,
  intermediateAt,
  advancedAt,
}: {
  level: string;
  points: number;
  intermediateAt: number;
  advancedAt: number;
}) {
  const t = useTranslations("operator");

  const atTop = level === "ADVANCED";
  const floor = level === "INTERMEDIATE" ? intermediateAt : 0;
  const ceiling = level === "INTERMEDIATE" ? advancedAt : intermediateAt;

  const progress = atTop
    ? 100
    : Math.min(100, Math.round(((points - floor) / (ceiling - floor)) * 100));
  const remaining = Math.max(0, ceiling - points);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[20px] font-extrabold text-ink-900 tabular">
          {points}
        </span>
        <span className="text-[12px] font-semibold text-ink-500">
          {atTop ? t("maxLevel") : t("toNextLevel", { points: remaining })}
        </span>
      </div>

      <span className="relative block h-2.5 overflow-hidden rounded-full bg-ink-100">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{
            width: `${Math.max(progress, 3)}%`,
            backgroundColor: SEQUENTIAL[atTop ? 5 : 3],
          }}
        />
      </span>
    </div>
  );
}
