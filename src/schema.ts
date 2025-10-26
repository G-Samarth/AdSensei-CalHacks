export const AD_METRICS_SCHEMA = {
  name: "ad_creative_metrics",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      asset_type: { type: "string", enum: ["image", "video", "unknown"] },
      summary: { type: "string" },

      // Key scores
      catchiness_level: { type: "integer", minimum: 0, maximum: 100 },
      aesthetics_score: { type: "integer", minimum: 0, maximum: 100 },
      readability_score: { type: "integer", minimum: 0, maximum: 100 },
      brand_fit_score: { type: "integer", minimum: 0, maximum: 100 },
      memorability_score: { type: "integer", minimum: 0, maximum: 100 },

      sentiment: {
        type: "string",
        enum: ["very_negative", "negative", "neutral", "positive", "very_positive"]
      },
      tone: { type: "string" },
      product_category: { type: "string" },

      detected_text: { type: "array", items: { type: "string" } },
      detected_logos: { type: "array", items: { type: "string" } },
      objects: { type: "array", items: { type: "string" } },

      audio_visual_signals: {
        type: "object",
        additionalProperties: false,
        properties: {
          color_palette: { type: "array", items: { type: "string" } },
          composition_notes: { type: "string" },
          style_keywords: { type: "array", items: { type: "string" } }
        },
        // ADDED: strict nested required
        required: ["color_palette", "composition_notes", "style_keywords"]
      },

      target_audience: {
        type: "object",
        additionalProperties: false,
        properties: {
          age_ranges: { type: "array", items: { type: "string" } },
          interests: { type: "array", items: { type: "string" } },
          regions: { type: "array", items: { type: "string" } }
        },
        // ADDED: strict nested required
        required: ["age_ranges", "interests", "regions"]
      },

      best_platforms: { type: "array", items: { type: "string" } },

      improvement_suggestions: { type: "array", items: { type: "string" } },
      reasons_for_scores: { type: "array", items: { type: "string" } },

      dimension_profile: {
        type: "object",
        additionalProperties: false,
        properties: {
          creative_attention: { type: "integer", minimum: 0, maximum: 100 },
          aesthetics: { type: "integer", minimum: 0, maximum: 100 },
          readability: { type: "integer", minimum: 0, maximum: 100 },
          brandFit: { type: "integer", minimum: 0, maximum: 100 },
          memorability: { type: "integer", minimum: 0, maximum: 100 }
        },
        // ADDED: strict nested required
        required: ["creative_attention", "aesthetics", "readability", "brandFit", "memorability"]
      }
    },
    required: [
      "asset_type",
      "summary",
      "catchiness_level",
      "aesthetics_score",
      "readability_score",
      "brand_fit_score",
      "memorability_score",
      "sentiment",
      "tone",
      "product_category",
      "detected_text",
      "detected_logos",
      "objects",
      "audio_visual_signals",
      "target_audience",
      "best_platforms",
      "improvement_suggestions",
      "reasons_for_scores",
      "dimension_profile"
    ]
  },
  strict: true
} as const;
