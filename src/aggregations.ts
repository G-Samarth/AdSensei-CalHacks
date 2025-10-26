import type { Asset } from "./store.js";

type Bucket = Record<string, number>;
const inc = (b: Bucket, k: string | undefined) => {
  if (!k) return;
  b[k] = (b[k] || 0) + 1;
};

export function buildAllInsights(assets: Asset[]) {
  const analyzed = assets.filter(a => a.status === "done" && a.result);

  const categories: Bucket = {};
  const sentiments: Bucket = {};
  const tones: Bucket = {};
  const platforms: Bucket = {};
  const colors: Bucket = {};
  const ageRanges: Bucket = {};

  let aestheticsSum = 0;
  let catchinessSum = 0;
  let readabilitySum = 0;
  let brandFitSum = 0;
  let memorabilitySum = 0;

  const dims = {
    creative_attention: [] as { id: string; score: number }[],
    aesthetics: [] as { id: string; score: number }[],
    readability: [] as { id: string; score: number }[],
    brandFit: [] as { id: string; score: number }[],
    memorability: [] as { id: string; score: number }[]
  };

  const composite: { id: string; score: number; title: string }[] = [];

  for (const a of analyzed) {
    const r = a.result;

    inc(categories, r.product_category);
    inc(sentiments, r.sentiment);
    inc(tones, r.tone);

    (r.best_platforms || []).forEach((p: string) => inc(platforms, p));
    (r.audio_visual_signals?.color_palette || []).forEach((hex: string) => inc(colors, hex.toLowerCase()));
    (r.target_audience?.age_ranges || []).forEach((ar: string) => inc(ageRanges, ar));

    aestheticsSum += r.aesthetics_score || 0;
    catchinessSum += r.catchiness_level || 0;
    readabilitySum += r.readability_score || 0;
    brandFitSum += r.brand_fit_score || 0;
    memorabilitySum += r.memorability_score || 0;

    const d = r.dimension_profile || {};
    const name = r.summary?.slice(0, 80) || a.url;

    if (typeof d.creative_attention === "number") dims.creative_attention.push({ id: a.id, score: d.creative_attention });
    if (typeof d.aesthetics === "number") dims.aesthetics.push({ id: a.id, score: d.aesthetics });
    if (typeof d.readability === "number") dims.readability.push({ id: a.id, score: d.readability });
    if (typeof d.brandFit === "number") dims.brandFit.push({ id: a.id, score: d.brandFit });
    if (typeof d.memorability === "number") dims.memorability.push({ id: a.id, score: d.memorability });

    const comp =
      (Number(r.catchiness_level || 0) +
        Number(r.aesthetics_score || 0) +
        Number(r.readability_score || 0) +
        Number(r.brand_fit_score || 0) +
        Number(r.memorability_score || 0)) / 5;

    composite.push({ id: a.id, score: comp, title: name });
  }

  const n = analyzed.length || 1;
  const topN = (arr: { id: string; score: number }[], k = 3) =>
    arr.sort((a, b) => b.score - a.score).slice(0, k);

  const topComposite = composite.sort((a, b) => b.score - a.score).slice(0, 10);

  return {
    totals: { analyzed: analyzed.length },
    averages: {
      aesthetics: Math.round(aestheticsSum / n),
      catchiness: Math.round(catchinessSum / n),
      readability: Math.round(readabilitySum / n),
      brandFit: Math.round(brandFitSum / n),
      memorability: Math.round(memorabilitySum / n)
    },
    top_categories: sortBucket(categories, 10),
    sentiment_distribution: sortBucket(sentiments, 10),
    tone_distribution: sortBucket(tones, 10),
    top_colors: sortBucket(colors, 12),
    audience_age_ranges: sortBucket(ageRanges, 10),
    best_platforms: sortBucket(platforms, 10),
    dimension_profile: {
      creative_attention: topN(dims.creative_attention, 3),
      aesthetics: topN(dims.aesthetics, 3),
      readability: topN(dims.readability, 3),
      brandFit: topN(dims.brandFit, 3),
      memorability: topN(dims.memorability, 3)
    },
    asset_summary_top10: topComposite
  };
}

function sortBucket(b: Record<string, number>, limit = 10) {
  return Object.entries(b)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}
