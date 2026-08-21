/**
 * Categorical series colours, validated with the dataviz palette checker
 * (light surface): lightness band, chroma floor, CVD separation and
 * normal-vision separation all pass.
 *
 * Assign these in fixed order and never cycle them — a ninth series folds into
 * "Other" or becomes small multiples instead of getting a generated hue.
 *
 * Caveat from the same run: ACCENT sits at 2.09:1 against a light surface, below
 * the 3:1 bar. Whenever it carries data it needs relief — a direct label, or the
 * table view beside the chart. Never let it be the only cue.
 */
export const SERIES = [
  "#1a56db", // brand blue
  "#f59e0b", // amber — see contrast caveat above
  "#059669", // green
  "#7c3aed", // violet
  "#e11d48", // rose
  "#0d9488", // teal
] as const;

/** Single-hue ramp for magnitude (sequential) encodings. */
export const SEQUENTIAL = [
  "#dbe6fe",
  "#bfd3fe",
  "#93b4fd",
  "#608cfa",
  "#3b6df6",
  "#1a56db",
] as const;

export const CHART_INK = {
  grid: "#e2e8f0",
  axis: "#94a3b8",
  label: "#64748b",
  surface: "#ffffff",
} as const;
