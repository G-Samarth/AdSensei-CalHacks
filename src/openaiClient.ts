import axios from "axios";
import { AD_METRICS_SCHEMA } from "./schema.js";

const LAVA_URL =
  "https://api.lavapayments.com/v1/forward?u=" +
  encodeURIComponent("https://api.openai.com/v1/chat/completions");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const LAVA_BEARER = process.env.LAVA_BEARER;

if (!LAVA_BEARER) {
  console.error("Missing LAVA_BEARER in .env");
  process.exit(1);
}

export async function analyzeWithOpenAI(urls: string[], kind: "image" | "video" | "unknown") {
  // IMPORTANT: Chat Completions expects content array with {type:"text"} and {type:"image_url"}
  // Each image item is: { type: "image_url", image_url: { url: "https://..." } }
  const content: any[] = [
    { type: "text", text: "Analyze this advertisement and output metrics per the schema." }
  ];

  for (const u of urls) {
    content.push({
      type: "image_url",
      image_url: { url: u } // must be a direct, publicly fetchable image URL
    });
  }

  const payload = {
    model: MODEL,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: AD_METRICS_SCHEMA
    },
    messages: [
      {
        role: "system",
        content: [
          { type: "text", text: "You are an ad-creative analyst. Return ONLY JSON that matches the provided schema. Be precise; avoid guesses." }
        ]
      },
      {
        role: "user",
        content
      }
    ]
  };

  try {
    const { data } = await axios.post(LAVA_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LAVA_BEARER}`
      },
      timeout: 90_000,
      // Uncomment for debugging through proxies etc:
      // validateStatus: () => true
    });

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI returned no content");

    let parsed: any;
    try {
      parsed = typeof text === "string" ? JSON.parse(text) : text;
    } catch {
      parsed = text;
    }

    if (!parsed.asset_type || parsed.asset_type === "unknown") parsed.asset_type = kind;
    return parsed;
  } catch (err: any) {
    // Surface the real reason (OpenAI returns a descriptive JSON error)
    const status = err?.response?.status;
    const body = err?.response?.data;
    const msg = body?.error?.message || body?.message || err?.message || "Unknown error";
    // Log for server console; also throw a concise message up
    console.error("OpenAI call failed", { status, body });
    throw new Error(`OpenAI 400: ${msg}`);
  }
}
