import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  prompt?: string;
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
  const prompt = String(body.prompt || "").trim().slice(0, 1000);
  if (prompt.length < 8) {
    return NextResponse.json(
      { error: "Prompt is too short (min 8 characters)." },
      { status: 400 },
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the web app." },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const system = `You improve prompts for an AI video studio.
Return only the rewritten prompt, no markdown and no explanation.
Keep the user's language.
Make it specific, production-ready, and concise.
Do not add resolution, duration, quality, speech tempo, music style, or video type unless the user already asked for it.
The final prompt must be under 900 characters.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      max_tokens: 280,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
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

  const improved = String(data.choices?.[0]?.message?.content || "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .slice(0, 1000);
  if (improved.length < 8) {
    return NextResponse.json(
      { error: "AI returned an empty prompt" },
      { status: 502 },
    );
  }

  return NextResponse.json({ prompt: improved, usage: data.usage || null });
}
