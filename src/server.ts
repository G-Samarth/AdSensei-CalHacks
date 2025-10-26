import "dotenv/config";
import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { stringify as csvStringify } from "csv-stringify";
import { Store, type Asset } from "./store.js";
import { analyzeWithOpenAI } from "./openaiClient.js";
import { buildAllInsights } from "./aggregations.js";
import cors from "cors";

const app = express();

app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    maxAge: 86400,
  })
);

app.options("*", cors());

const upload = multer({ storage: multer.memoryStorage() });

function guessTypeFromUrl(url: string): "image" | "video" | "unknown" {
  const u = url.toLowerCase();
  if (u.match(/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/)) return "image";
  if (u.match(/\.(mp4|mov|webm|mkv|avi)(\?|$)/)) return "video";
  return "unknown";
}

// Ingest Excel: one URL per row in first column
app.post("/ingest/excel", upload.single("file"), async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ error: "Upload an .xlsx file under field 'file'." });
  const wb = XLSX.read(req.file.buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const urls = rows.map((r) => String(r[0] || "").trim()).filter(Boolean);
  if (!urls.length)
    return res.status(400).json({ error: "No URLs found in first column." });

  const assets: Asset[] = urls.map((u) => ({
    id: randomUUID(),
    url: u,
    type: guessTypeFromUrl(u),
    status: "pending",
  }));
  Store.upsertMany(assets);
  return res.json({
    ingested: assets.length,
    assets: assets.map((a) => ({
      id: a.id,
      url: a.url,
      type: a.type,
      status: a.status,
    })),
  });
});

// Ingest JSON: { "urls": ["...","..."] }
app.post("/ingest/json", async (req, res) => {
  const urls: string[] = Array.isArray(req.body?.urls) ? req.body.urls : [];
  if (!urls.length)
    return res.status(400).json({ error: "Provide { urls: string[] }" });
  const assets: Asset[] = urls.map((u) => ({
    id: randomUUID(),
    url: u,
    type: guessTypeFromUrl(u),
    status: "pending",
  }));
  Store.upsertMany(assets);
  return res.json({
    ingested: assets.length,
    assets: assets.map((a) => ({
      id: a.id,
      url: a.url,
      type: a.type,
      status: a.status,
    })),
  });
});

// List assets
app.get("/assets", async (_req, res) => {
  const assets = Store.list();
  res.json({ count: assets.length, assets });
});

// Analyze single ad
app.post("/analyseAd/:adId", async (req, res) => {
  const ad = Store.get(req.params.adId);
  if (!ad) return res.status(404).json({ error: "Ad not found" });

  try {
    ad.status = "processing";
    Store.upsert(ad);
    const result = await analyzeWithOpenAI([ad.url], ad.type);
    ad.result = result;
    ad.status = "done";
    Store.upsert(ad);
    res.json({
      id: ad.id,
      url: ad.url,
      type: ad.type,
      status: ad.status,
      result,
    });
  } catch (e: any) {
    ad.status = "error";
    ad.error = e?.message || "analysis failed";
    Store.upsert(ad);
    res.status(500).json({ error: ad.error });
  }
});

// Analyze all (pending/error)
app.post("/analyseAll", async (req, res) => {
  const assets = Store.list();
  const pending = assets.filter(
    (a) => a.status === "pending" || a.status === "error"
  );
  const limit = pLimit(Number(process.env.BATCH_CONCURRENCY || 5));

  const tasks = pending.map((a) =>
    limit(async () => {
      try {
        a.status = "processing";
        Store.upsert(a);
        const result = await analyzeWithOpenAI([a.url], a.type);
        a.result = result;
        a.status = "done";
        Store.upsert(a);
      } catch (e: any) {
        a.status = "error";
        a.error = e?.message || "analysis failed";
        Store.upsert(a);
      }
    })
  );

  await Promise.all(tasks);
  const done = Store.list().filter((a) => a.status === "done").length;
  res.json({ analysed_now: pending.length, total_done: done });
});

// Get single result
app.get("/ad/:adId", (req, res) => {
  const ad = Store.get(req.params.adId);
  if (!ad) return res.status(404).json({ error: "Ad not found" });
  res.json(ad);
});

// All-ad rollups
app.get("/AllAdInsights", (req, res) => {
  const insights = buildAllInsights(Store.list());
  res.json(insights);
});

// Export CSV
app.get("/export.csv", (req, res) => {
  const assets = Store.list().filter((a) => a.status === "done" && a.result);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=ad_metrics.csv");

  const stringifier = csvStringify({
    header: true,
    columns: [
      "id",
      "url",
      "asset_type",
      "catchiness_level",
      "aesthetics_score",
      "readability_score",
      "brand_fit_score",
      "memorability_score",
      "sentiment",
      "tone",
      "product_category",
      "best_platforms",
    ],
  });

  stringifier.pipe(res);
  for (const a of assets) {
    const r = a.result;
    stringifier.write({
      id: a.id,
      url: a.url,
      asset_type: r.asset_type,
      catchiness_level: r.catchiness_level,
      aesthetics_score: r.aesthetics_score,
      readability_score: r.readability_score,
      brand_fit_score: r.brand_fit_score,
      memorability_score: r.memorability_score,
      sentiment: r.sentiment,
      tone: r.tone,
      product_category: r.product_category,
      best_platforms: (r.best_platforms || []).join("|"),
    });
  }
  stringifier.end();
});

// Health
app.get("/", (_req, res) => res.send("Ad Analytics API is running."));

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`Ad Analytics API listening on http://localhost:${PORT}`);
});
