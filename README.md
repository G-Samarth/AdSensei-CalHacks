# AdSensei Backend

Turns raw ad creatives into **clear, actionable insights**—per asset and in batch.

## Endpoints

* `POST /analyzeAd/:id` → single asset insights (summary, tone/sentiment, OCR text, logos/objects, scores, recommendations).
* `POST /allAdInsights` → batch roll-up (Top 10, Dimension Profiles, sentiment/tone maps, color trends).

## Quickstart

```bash
git clone https://github.com/<you>/adsensei-backend.git
cd adsensei-backend
cp .env.example .env   # fill vars below
npm i && npm run dev   # or: npm start

# Docker
docker build -t adsensei-backend .
docker run --env-file .env -p 8080:8080 adsensei-backend
```

## Env Vars

```
PORT=8080
LAVA_FORWARD_URL=https://api.lavapayments.com/v1/forward
OPENAI_COMPAT_URL=https://api.openai.com/v1/chat/completions   # used via Lava (u=)
LAVA_API_KEY=***
REKA_MODEL=reka-flash        # or gpt-4o-mini via Lava
WORKERS=8                    # parallel workers
MAX_BATCH_SIZE=50
```

## Example Request

```bash
curl -X POST "http://localhost:8080/analyzeAd/5966b1e8" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://.../ad.jpg","metadata":{"campaign":"Spring"}}'
```

## Tech

* Node/TS (or Python equivalent), worker pool for **parallel** processing
* **Lava** + **Reka** for VLM summaries/rationales; local extractors for OCR, logos/objects, palette/density
* Reducer to build campaign insights fast (<5 min for ~40–50 assets)

## License & Credits

MIT. Built at **CalHacks 12.0** with **creao.ai**, **Lava**, **Reka**. Inspired by **AppLovin**.
