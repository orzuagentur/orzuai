import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichAiPresentationPlan } from "@/lib/presentation/ai-assets";

export const runtime = "nodejs";

type Body = {
  prompt?: string;
  format?: "pdf" | "word" | "pptx";
  slide_count?: number | "auto";
  info?: {
    author?: string;
    company?: string;
    website?: string;
    permissions?: string;
    notes?: string;
  };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 8) {
    return NextResponse.json(
      { error: "Prompt is too short (min 8 characters)." },
      { status: 400 },
    );
  }

  const format =
    body.format === "word" || body.format === "pptx" ? body.format : "pdf";
  const slideCountRaw = body.slide_count;
  const slideCount =
    slideCountRaw === "auto" || slideCountRaw == null
      ? null
      : Math.max(4, Math.min(14, Number(slideCountRaw) || 8));

  const info = {
    author: String(body.info?.author || "").trim().slice(0, 120),
    company: String(body.info?.company || "").trim().slice(0, 120),
    website: String(body.info?.website || "").trim().slice(0, 300),
    permissions: String(body.info?.permissions || "").trim().slice(0, 400),
    notes: String(body.info?.notes || "").trim().slice(0, 400),
  };

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the web app." },
      { status: 500 },
    );
  }
  const model =
    process.env.OPENAI_PRESENTATION_MODEL || process.env.OPENAI_MODEL || "gpt-4o";

  const lengthRule = slideCount
    ? `Create exactly ${slideCount} content slides.`
    : "Choose 8–12 slides — each with a distinct creative idea.";

  const system = `You are a world-class creative director for OrzuAi (agency / pitch / keynote level).
Return STRICT JSON only. Every deck must feel UNIQUE, bold, and premium — never a boring template.

${lengthRule}
Detect language from the prompt; write ALL on-slide text in that language.
Pick themeId deliberately for mood: midnight, ivory, ocean, forest, sunset, graphite, rose, slate, aurora, ember, frost, orchid, ink, sand.

CREATIVITY MANDATE:
- No two slides may share the same layout OR the same typography recipe.
- Mix text styles aggressively: hero, display, title, subtitle, kicker, body, bullet, quote, caption, stat, label, emphasis.
- Vary fontSize explicitly (12–64). Pair a huge hero/stat with tiny kickers/captions.
- Use italic quotes, bold emphasis lines, and short punchy bullets — not walls of text.
- At least 2 slides with charts (different chart types). At least 1 slide with a big "stat" number.
- Almost every slide needs real media: image and/or OpenMoji emoji and/or icons.
- English queries only for image/emoji/icon fields.

DESIGN QUALITY CONTRACT:
- Think like a senior keynote designer, not a generic slide generator.
- Every slide must have one visual hierarchy: one hero idea, one support layer, one optional proof layer.
- Keep important elements inside safe margins: x 4-92, y 5-86. Avoid overlaps unless a shape is intentionally behind text.
- Text must be short enough to fit its box. Use strong titles, compact bullets, and precise labels.
- Prefer asymmetric editorial layouts, large negative space, and meaningful contrast.
- Use backgroundImageQuery on cover, media_focus, quote, and at least 40% of the deck.
- Add slide notes with speaker intent, not generic narration.
- Before returning JSON, silently audit: visual variety, readable contrast, no crowded slides, no repeated stock query, no duplicate chart type.

Layouts (vary across deck): cover, split, icons, emoji, media_focus, stats, quote, content, comparison, timeline, mosaic

TEXT element (rich typography):
{"type":"text","style":"hero|display|title|subtitle|kicker|body|bullet|quote|caption|stat|label|emphasis","text":"...","fontSize":48,"fontWeight":800,"italic":false,"align":"left|center|right","color":"#optional","x":8,"y":20,"w":70,"h":16}

Other elements:
- image: {"type":"image","query":"english photo keywords","provider":"unsplash|pexels","x","y","w","h"}
- emoji: {"type":"emoji","query":"rocket|money bag|light bulb|…","x","y","w":14-24,"h":16-28}
- icon: {"type":"icon","query":"growth|shield|users|…","color":"#F8FAFC","x","y","w","h"}
- shape: {"type":"shape","shape":"roundRect|rect|ellipse|diamond|chevron","fill":"#hex","opacity":0.2-0.9,"x","y","w","h"}
- chart: {"type":"chart","chart":"bar|barH|line|area|pie|donut|donutThin|stacked|radar|funnel|gauge|progress|kpi|comparison|lollipop|ring|waterfall|groupedBar|stackedBarH|bullet|sparkline|pyramid|treemap|bubble|radialBar|meter","title":"...","labels":[],"values":[],"x","y","w","h"}

Also set slide.backgroundImageQuery on cover/media slides.
Keep readable hierarchy: 1 dominant text + 1–2 support texts max on most slides.
Max 5-8 elements/slide. Meaning-matched emoji/icons only. Include notes on each slide.

JSON:
{
  "title":"...",
  "themeId":"aurora",
  "slides":[
    {
      "name":"Hook",
      "layout":"cover",
      "backgroundImageQuery":"cinematic neon city rain reflections",
      "notes":"Open with a sharp transformation promise, then pause before the proof.",
      "elements":[
        {"type":"text","style":"kicker","text":"CHAPTER 01","fontSize":12,"fontWeight":700,"x":8,"y":18,"w":40,"h":6},
        {"type":"text","style":"hero","text":"Bold opening line","fontSize":54,"fontWeight":800,"x":8,"y":32,"w":72,"h":20},
        {"type":"emoji","query":"rocket","x":78,"y":16,"w":16,"h":18}
      ]
    }
  ]
}`;

  const userMsg = `PROMPT:
"""${prompt}"""

Export preference: ${format}
Brand / info (weave into cover/contact when useful):
- Author: ${info.author || "(none)"}
- Company: ${info.company || "(none)"}
- Website / QR: ${info.website || "(none)"}
- Permissions: ${info.permissions || "(none)"}
- Notes: ${info.notes || "(none)"}

Make this the most creative, visually powerful deck possible for this brief. Surprise me with layout rhythm and typography contrast.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "OpenAI request failed" },
      { status: 502 },
    );
  }

  let plan: Record<string, unknown> = {};
  try {
    plan = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    return NextResponse.json(
      { error: "AI returned invalid JSON" },
      { status: 502 },
    );
  }

  try {
    plan = await enrichAiPresentationPlan(plan, supabase);
  } catch (err) {
    console.warn("[AI_PRES] enrich failed:", err);
  }

  return NextResponse.json({
    plan,
    format,
    info,
    usage: data.usage || null,
  });
}
