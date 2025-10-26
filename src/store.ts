import fs from "fs";
import path from "path";

export type Asset = {
  id: string;
  url: string;
  type: "image" | "video" | "unknown";
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  result?: any;
};

export type DB = {
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) {
  const init: DB = { assets: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2), "utf-8");
}

function load(): DB {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}
function save(data: DB) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export const Store = {
  list(): Asset[] {
    return load().assets;
  },
  get(id: string): Asset | undefined {
    return load().assets.find(a => a.id === id);
  },
  upsert(asset: Asset) {
    const db = load();
    const idx = db.assets.findIndex(a => a.id === asset.id);
    if (idx >= 0) db.assets[idx] = asset;
    else db.assets.push(asset);
    save(db);
  },
  upsertMany(assets: Asset[]) {
    const db = load();
    const existing = new Map(db.assets.map(a => [a.id, a]));
    for (const a of assets) existing.set(a.id, a);
    db.assets = Array.from(existing.values());
    save(db);
  },
  replaceAll(assets: Asset[]) {
    const db = load();
    db.assets = assets;
    save(db);
  }
};
