from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from orzuvideo.config import settings
from orzuvideo.services.usage import estimate_openai_cost, log_usage


SYSTEM_PROMPT = """You are an elite YouTube scriptwriter and creative director.
Write a {content_kind} that STRICTLY follows the user's AI Training settings below.
Rules:
- Spoken duration target: {duration} seconds (about {word_count} words).
- LANGUAGE CODE: {language}
  HARD RULE: write hook, script, title, description, tags, CTA wording ENTIRELY in this language.
  If any training field (CTA, hook style, style notes) is in another language, TRANSLATE it into {language}.
  Never leave English CTA/hook/title when language is not "en".
- Format: {video_format}{video_style_line}
- Aspect / framing: {aspect_hint}
- HARD RULE — niche / theme / content type from AI Training are mandatory:
  Stay inside the selected niche and theme. Do NOT drift into unrelated topics
  (e.g. motivational gym content unless niche says so).
- CRITICAL OPENING: the first few seconds MUST grab attention.
  The "hook" field must be a punchy pattern interrupt in {language}.
  The spoken script MUST start with that hook.
- After the hook: {pacing_hint}
- Use ONLY the training fields provided. Do NOT invent niche/style/tone/content-type
  that the user did not set. Do NOT default to motivational/discipline content
  unless niche/style explicitly says so.
- Return STRICT JSON only, no markdown.
JSON schema:
{{
  "hook": "attention-grabbing opening line",
  "script": "full spoken narration STARTING with the hook",
  "title": "YouTube title under 70 chars",
  "description": "YouTube description with hashtags",
  "tags": ["tag1", "tag2"],
  "pexels_queries": ["query1", "query2", "query3", "query4", "query5"],
  "subtitle_emphasis": ["WORD1", "WORD2"]
}}
"""

SYSTEM_PROMPT_AUTO = """You are an elite YouTube scriptwriter and creative director.
Write a {content_kind} that STRICTLY follows the user's AI Training settings below.
Rules:
- Choose the ideal spoken duration yourself between {min_duration} and {max_duration} seconds based on the topic
  (simple idea → shorter; richer story → longer). Do NOT force a fixed length.
- Put your chosen length in "duration_seconds" (integer {min_duration}–{max_duration}).
- Aim for about 2.4 words per second of speech.
- LANGUAGE CODE: {language}
  HARD RULE: write hook, script, title, description, tags, CTA wording ENTIRELY in this language.
  If any training field (CTA, hook style, style notes) is in another language, TRANSLATE it into {language}.
  Never leave English CTA/hook/title when language is not "en".
- Format: {video_format}{video_style_line}
- Aspect / framing: {aspect_hint}
- HARD RULE — niche / theme / content type from AI Training are mandatory:
  Stay inside the selected niche and theme. Do NOT drift into unrelated topics
  unless niche/style explicitly allows it.
- CRITICAL OPENING: the first few seconds MUST grab attention.
  The "hook" field must be a punchy pattern interrupt in {language}.
  The spoken script MUST start with that hook.
- After the hook: {pacing_hint}
- Use ONLY the training fields provided. Do NOT invent niche/style/tone/content-type
  that the user did not set. Do NOT default to motivational/discipline content
  unless niche/style explicitly says so.
- Return STRICT JSON only, no markdown.
JSON schema:
{{
  "duration_seconds": {default_duration},
  "hook": "attention-grabbing opening line",
  "script": "full spoken narration STARTING with the hook",
  "title": "YouTube title under 70 chars",
  "description": "YouTube description with hashtags",
  "tags": ["tag1", "tag2"],
  "pexels_queries": ["query1", "query2", "query3", "query4", "query5"],
  "subtitle_emphasis": ["WORD1", "WORD2"]
}}
"""


def _format_profile(video_format: str) -> dict[str, Any]:
    """Map AI Training format → aspect, duration bounds, writing style hints."""
    fmt = (video_format or "shorts").strip().lower()
    if fmt in ("video", "long", "longform", "youtube_video"):
        return {
            "content_kind": "horizontal YouTube video (16:9, long-form)",
            "aspect": "16:9",
            "min_duration": 90,
            "max_duration": 600,
            "default_duration": 180,
            "aspect_hint": "Landscape 16:9 — cinematic B-roll, not vertical Shorts.",
            "pacing_hint": (
                "Develop a clear structure (intro → points/story → payoff). "
                "Use fuller sentences; still keep energy and clarity."
            ),
            "is_short": False,
            "default_tags": ["youtube"],
            "hashtag_suffix": "",
        }
    if fmt in ("simple", "simple_video"):
        return {
            "content_kind": "simple horizontal YouTube video (16:9)",
            "aspect": "16:9",
            "min_duration": 60,
            "max_duration": 300,
            "default_duration": 120,
            "aspect_hint": "Landscape 16:9 — clean, simple edit suitable for YouTube.",
            "pacing_hint": (
                "Keep structure simple: hook, 2–4 clear points, soft close. "
                "Easy to follow; no overcomplicated storytelling."
            ),
            "is_short": False,
            "default_tags": ["youtube"],
            "hashtag_suffix": "",
        }
    # shorts + legacy mixer / reel-style values
    return {
        "content_kind": "vertical YouTube Short (9:16)",
        "aspect": "9:16",
        "min_duration": 15,
        "max_duration": 60,
        "default_duration": 45,
        "aspect_hint": "Vertical 9:16 Shorts — mobile-first, scroll-stopping.",
        "pacing_hint": "Use short punchy sentences. No fluff.",
        "is_short": True,
        "default_tags": ["shorts"],
        "hashtag_suffix": "\n\n#Shorts",
    }

# Platform Creativity — independent of YouTube AI Training
CREATIVITY_SYSTEM = """You are a professional short-form video creative director for an in-app video studio.
This is NOT YouTube. There is NO brand training, NO channel niche, NO saved language preference.
The user prompt is the ONLY source of truth for topic, tone, scenes, and language.

Rules:
- Obey the user's creative brief as closely as possible: topic, mood, characters, setting, pacing, and style.
- Refuse and rewrite away from illegal / harmful requests (real-world crime how-tos, child sexual content,
  non-consensual sexual content, extreme gore for shock, scams, weapons manufacturing). If the prompt
  asks for that, produce a safe alternative on-topic creative video instead and keep tone family-friendly.
- Detect the spoken language STRICTLY from the user prompt text itself
  (Cyrillic → usually ru/uz; Latin with Uzbek words → uz; English words → en; etc.).
  Write the ENTIRE narration ("script" and "hook") in that detected language.
  Never default to English unless the prompt itself is English.
- Put the language code in "language" (en, ru, uz, tr, es, de, fr, …).
- Invent a short catchy video TITLE (max 60 characters) in the same language as the script.
  NEVER copy or lightly edit the user prompt as the title.
- "script" is the full spoken narration. Punchy, cinematic, no fluff — match the user's requested vibe.
- First 3 seconds must hook attention. Put that opener in "hook" (4–12 words) and start the script with it.
- For STANDARD videos: choose B-roll search queries in English for stock footage (pexels_queries).
- For EMOJI videos: do NOT use stock footage. Fill background_colors with solid hex colors and a rich asset_overlays plan.
- Suggest a subtitle style hint in "subtitle_style", a look filter in "visual_effect",
  preferred_transition, and montage_pace from the AVAILABLE TOOLS block below.
  Prefer ids that match the prompt mood. Never invent ids outside that list.
{tools_block}
- Set flash_cuts true for high-energy / hype / sales prompts; false for calm / luxury / storytelling.
- Do NOT invent motivational-coach / gym / discipline themes unless the prompt asks for them.
- Match EVERY creative choice (tone, colors, subtitle look, motion energy) to the user's prompt theme.
- Return STRICT JSON only, no markdown.
{duration_rule}
{video_type_rule}
JSON schema:
{{
  "language": "ru",
  "title": "Catchy video name (NOT the prompt)",
  "hook": "short opening line",
  "script": "full spoken narration in the detected language",
  "description": "one short summary sentence",
  "tags": ["tag1", "tag2"],
  "pexels_queries": ["query1", "query2", "query3", "query4", "query5"],
  "background_colors": ["0F172A", "312E81", "0F766E"],
  "subtitle_emphasis": ["WORD1", "WORD2"],
  "subtitle_style": "classic",
  "visual_effect": "cinematic",
  "preferred_transition": "smoothleft",
  "montage_pace": "medium",
  "flash_cuts": false,
  "music_mood": "short english mood phrase",
  "duration_seconds": 30,
  "asset_overlays": [
    {{
      "kind": "emoji",
      "query": "rocket",
      "label": "rocket",
      "meaning": "fast growth",
      "role": "hero",
      "start_pct": 0.08,
      "duration": 3.2,
      "position": "center",
      "size_pct": 0.38,
      "animation": "slide_up",
      "color": "#FFFFFF"
    }}
  ]
}}
"""


def _log_openai_usage(
    *,
    user_id: str | None,
    job_id: str | None,
    response: Any,
    kind: str = "script_generation",
) -> None:
    if not user_id or not response.usage:
        return
    cost = estimate_openai_cost(
        response.usage.prompt_tokens or 0,
        response.usage.completion_tokens or 0,
    )
    log_usage(
        user_id=user_id,
        job_id=job_id,
        provider="openai",
        kind=kind,
        units=(response.usage.prompt_tokens or 0)
        + (response.usage.completion_tokens or 0),
        unit_label="tokens",
        cost_usd=cost,
        meta={
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "model": settings.openai_model,
        },
    )


def _filled(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


_OVERLAY_POSITIONS = {
    "top_left",
    "top_center",
    "top_right",
    "center_left",
    "center",
    "center_right",
    "bottom_left",
    "bottom_right",
}


def _as_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _sanitize_hex_list(raw: Any, *, limit: int = 8) -> list[str]:
    items = raw if isinstance(raw, list) else []
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = str(item or "").strip().lstrip("#").upper()
        if len(text) == 3 and all(c in "0123456789ABCDEF" for c in text):
            text = "".join(ch * 2 for ch in text)
        if len(text) != 6 or any(c not in "0123456789ABCDEF" for c in text):
            continue
        if text in seen:
            continue
        seen.add(text)
        out.append(text)
        if len(out) >= limit:
            break
    return out


def _sanitize_overlay_color(raw: Any) -> str | None:
    text = str(raw or "").strip().lstrip("#").upper()
    if len(text) == 3 and all(c in "0123456789ABCDEF" for c in text):
        text = "".join(ch * 2 for ch in text)
    if len(text) == 6 and all(c in "0123456789ABCDEF" for c in text):
        return f"#{text}"
    return None


def _sanitize_asset_overlays(raw: Any, *, enabled: bool) -> list[dict[str, Any]]:
    """Sanitize overlay plans: large, dense, caption-safe (avoid lower-center)."""
    if not enabled:
        return []
    items = raw if isinstance(raw, list) else []
    out: list[dict[str, Any]] = []
    # Cluster-friendly layout: 3-up then 2-up alternating across beats.
    fallback_positions = [
        "center_left",
        "center",
        "center_right",
        "top_left",
        "top_center",
        "top_right",
        "bottom_left",
        "bottom_right",
        "center_left",
        "top_right",
        "center_right",
        "top_left",
        "center",
        "top_center",
        "bottom_left",
        "center_right",
        "top_right",
        "center_left",
        "top_left",
        "bottom_right",
    ]
    for idx, item in enumerate(items[:24]):
        if not isinstance(item, dict):
            continue
        query = _filled(item.get("query") or item.get("name") or item.get("label"))
        if not query:
            continue
        kind = str(item.get("kind") or "emoji").strip().lower()
        if kind not in ("emoji", "icon"):
            kind = "emoji"
        role = str(item.get("role") or "").strip().lower()
        if role not in ("hero", "support"):
            role = "hero" if idx % 3 == 1 else "support"
        start = max(0.01, min(0.92, _as_float(item.get("start_pct"), 0.04 + idx * 0.045)))
        duration = max(1.8, min(6.0, _as_float(item.get("duration"), 3.2)))
        default_size = 0.36 if role == "hero" else 0.24
        size = max(0.18, min(0.46, _as_float(item.get("size_pct"), default_size)))
        position = str(item.get("position") or "").strip().lower()
        if position not in _OVERLAY_POSITIONS or position in {
            "lower_center",
            "bottom_center",
        }:
            position = fallback_positions[idx % len(fallback_positions)]
        color = _sanitize_overlay_color(item.get("color"))
        meaning = _filled(item.get("meaning") or item.get("anchor") or item.get("label"))
        anim = str(item.get("animation") or "auto").strip().lower()
        if anim not in {
            "auto",
            "slide_left",
            "slide_right",
            "slide_up",
            "slide_down",
            "from_left",
            "from_right",
            "from_top",
            "from_bottom",
            "pop",
            "fade",
            "drop",
            "rise",
        }:
            # Rotate entrance sides so beats feel kinetic
            anim = (
                "slide_left",
                "slide_right",
                "slide_up",
                "slide_down",
                "pop",
            )[idx % 5]
        entry: dict[str, Any] = {
            "kind": kind,
            "query": query[:80],
            "label": (_filled(item.get("label")) or query)[:80],
            "start_pct": round(start, 3),
            "duration": round(duration, 2),
            "position": position,
            "size_pct": round(size, 3),
            "role": role,
            "animation": anim,
        }
        if meaning:
            entry["meaning"] = meaning[:80]
        if color:
            entry["color"] = color
        out.append(entry)
    return out[:20]


def _plan_emoji_visual_storyboard(
    *,
    client: OpenAI,
    script: str,
    hook: str,
    prompt: str,
    duration_seconds: float | None,
    user_id: str | None,
    job_id: str | None,
) -> list[dict[str, Any]]:
    """Second-pass storyboard: visuals explain more than the voice."""
    dur_hint = int(duration_seconds) if duration_seconds else "unknown"
    system = """You are a senior motion-graphics storyboard director for emoji explainer videos.
The narration is ONLY a guide. Emoji + icons must carry MOST of the meaning — a muted viewer should still understand the video.

Hard rules:
- Return STRICT JSON: {"asset_overlays":[...]} only.
- Plan 14-20 overlays total.
- Group into BEATS: every beat has 2-4 overlays that share the SAME start_pct (±0.01) and appear TOGETHER as one visual sentence.
- Advance beats through the whole video (start_pct from ~0.03 to ~0.88).
- Each overlay query MUST be a concrete OpenMoji/Iconify English name that LITERALLY matches that spoken idea
  (examples: money bag, rocket, light bulb, chart increasing, briefcase, robot, globe, trophy, fire, red heart, lock, shopping cart).
- NEVER use decorative fillers (sparkles/star) unless the script is literally about magic/stars.
- Prefer kind "emoji" for objects/emotions; kind "icon" for abstract UI symbols (check, shield, trend) with color "#F8FAFC" or "#FBBF24".
- role "hero" = main idea of the beat (size_pct 0.34-0.44); role "support" = flanking explainers (size_pct 0.20-0.30).
- Positions in a beat MUST differ (e.g. center_left + center + center_right, or top_left + top_right + center).
- Avoid lower_center / bottom_center (captions live there). bottom_left/bottom_right ok if sparse.
- duration 2.4-5.0 seconds so beats overlap slightly for flow.
- Add "meaning": short English phrase of what this glyph explains.
- Add "animation" for each overlay: slide_left, slide_right, slide_up, slide_down, or pop —
  vary entrances so glyphs fly in from different sides; match energy to the prompt theme.
"""
    user = f"""User brief:
\"\"\"{prompt}\"\"\"

Hook: {hook}
Approx duration seconds: {dur_hint}

Full spoken script (map EVERY major idea to emoji/icon beats):
\"\"\"{script}\"\"\"

Build a dense visual storyboard now. Visuals > voice.
"""
    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.55,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        _log_openai_usage(
            user_id=user_id,
            job_id=job_id,
            response=response,
            kind="emoji_visual_storyboard",
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        return _sanitize_asset_overlays(data.get("asset_overlays"), enabled=True)
    except Exception as exc:
        print(f"[EMOJI] visual storyboard planning skipped: {exc}")
        return []


def _montage_tools_block() -> str:
    try:
        from orzuvideo.pipeline.fx_library import catalog_prompt_block

        return catalog_prompt_block()
    except Exception as exc:
        print(f"[scriptgen] catalog tools skipped: {exc}")
        return ""


def _training_lines(training: dict[str, Any]) -> str:
    """Build prompt lines only from non-empty training fields."""
    mapping = [
        ("Niche", "niche"),
        ("Content type", "content_type"),
        ("Tone", "tone"),
        ("Target audience", "target_audience"),
        ("Hook style", "hook_style"),
        ("CTA (translate into language if needed)", "cta"),
        ("Brand rules", "brand_rules"),
        ("Brand / style instructions", "style_prompt"),
        ("Default Pexels vibe", "pexels_query"),
        ("Music mood", "music_mood"),
    ]
    lines: list[str] = []
    for label, key in mapping:
        val = _filled(training.get(key))
        if not val:
            continue
        if key == "style_prompt":
            lines.append(f'{label}:\n"""{val}"""')
        else:
            lines.append(f"{label}: {val}")
    return "\n".join(lines) if lines else "Niche: (follow style_prompt only)"


def generate_creativity_script(
    *,
    user_prompt: str,
    duration_auto: bool = True,
    duration_seconds: int | None = None,
    video_type: str | None = None,
    user_id: str | None = None,
    job_id: str | None = None,
) -> dict[str, Any]:
    """Create a video package from a free prompt — no AI Training / YouTube settings."""
    prompt = (user_prompt or "").strip()
    if len(prompt) < 8:
        raise RuntimeError("Creativity prompt is too short")

    client = OpenAI(api_key=settings.openai_api_key)

    # Creativity allows longer personal videos (up to 5 minutes).
    creat_min, creat_max = 15, 300
    if duration_auto or not duration_seconds:
        duration_rule = (
            f"- Choose ideal spoken duration yourself between {creat_min} and {creat_max} seconds "
            "based on the prompt complexity (shorts ~30–60s, stories/explainers up to a few minutes). "
            "Put it in duration_seconds."
        )
        target_note = f"Pick the best duration ({creat_min}–{creat_max}s) for this idea."
    else:
        dur = max(creat_min, min(creat_max, int(duration_seconds)))
        words = max(40, int(dur * 2.4))
        duration_rule = (
            f"- Spoken duration target: {dur} seconds (about {words} words). "
            f'Set "duration_seconds" to {dur}.'
        )
        target_note = f"Target length: {dur} seconds (~{words} words)."

    normalized_video_type = (video_type or "standard").strip().lower()
    emoji_video = normalized_video_type in {"emoji", "emoji_video", "emojis"}
    if emoji_video:
        video_type_rule = """
- VIDEO TYPE: Emoji explainer video (NO stock / Pexels footage).
- Set "pexels_queries" to [].
- Fill "background_colors" with 5-8 solid HEX mood colors (no #) — dark cinematic monochrome only.
- asset_overlays may be a rough draft (or []); a dedicated visual storyboard pass will refine them.
- Still prefer meaning-matched emoji queries if you include any draft overlays.
"""
    else:
        video_type_rule = (
            '- VIDEO TYPE: Standard video. Set "asset_overlays" to [] and "background_colors" to [].'
        )

    system = CREATIVITY_SYSTEM.format(
        duration_rule=duration_rule,
        video_type_rule=video_type_rule.strip(),
        tools_block=_montage_tools_block(),
    )
    user_msg = f"""USER PROMPT (ONLY source of truth — ignore any YouTube/channel training):
\"\"\"{prompt}\"\"\"

{target_note}

Hard requirements:
1) Detect language from THIS prompt only and write script+hook+title in that language.
2) Topic/theme must follow THIS prompt only — do not reuse generic motivational niches.
3) Title = original short name, never the raw prompt.
4) If video_type is emoji: pexels_queries=[], fill background_colors (solid mood hex).
   Visual storyboard (emoji/icons denser than voice) is planned in a dedicated pass.
   If standard: pexels_queries = English stock-search phrases; background_colors=[].
5) Respect safety: no illegal / sexual-minors / real crime-howto content.
6) Fill subtitle_style + visual_effect + preferred_transition + montage_pace + flash_cuts to match the mood of the prompt.
7) video_type = {normalized_video_type}.
8) Every creative choice must feel on-theme with the prompt (not generic stock montage).
"""

    response = client.chat.completions.create(
        model=settings.openai_model,
        temperature=0.85,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg.strip()},
        ],
    )
    _log_openai_usage(
        user_id=user_id,
        job_id=job_id,
        response=response,
        kind="creativity_script",
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    script = (data.get("script") or "").strip()
    if not script:
        raise RuntimeError("OpenAI returned empty creativity script")

    title = (data.get("title") or "").strip()
    prompt_l = prompt.lower().strip()
    title_l = title.lower().strip()
    # Never allow prompt-as-title
    if (
        not title
        or title_l == prompt_l
        or prompt_l.startswith(title_l)
        or title_l.startswith(prompt_l[:40])
    ):
        title = (data.get("hook") or "New video")[:60]

    language = (data.get("language") or "en").strip().lower()[:8] or "en"
    bg_colors = _sanitize_hex_list(data.get("background_colors"), limit=8) if emoji_video else []
    if emoji_video and len(bg_colors) < 4:
        bg_colors = _sanitize_hex_list(
            ["0F172A", "1E293B", "312E81", "0F766E", "7C2D12", "164E63"],
            limit=8,
        )
    result: dict[str, Any] = {
        "hook": data.get("hook") or script.split(".")[0],
        "script": script,
        "title": title[:90],
        "description": data.get("description") or script[:180],
        "tags": data.get("tags") or ["shorts"],
        "pexels_queries": []
        if emoji_video
        else (data.get("pexels_queries") or ["cinematic b-roll"]),
        "background_colors": bg_colors,
        "subtitle_emphasis": data.get("subtitle_emphasis") or [],
        "subtitle_style": data.get("subtitle_style") or "classic",
        "visual_effect": data.get("visual_effect") or "cinematic",
        "preferred_transition": str(
            data.get("preferred_transition") or "smoothleft"
        ).strip()
        or "smoothleft",
        "montage_pace": (
            str(data.get("montage_pace") or "medium").strip().lower()
            if str(data.get("montage_pace") or "").strip().lower()
            in ("viral", "fast", "medium", "cinematic")
            else "medium"
        ),
        "flash_cuts": bool(data.get("flash_cuts"))
        if data.get("flash_cuts") is not None
        else False,
        "language": language,
        "music_mood": data.get("music_mood"),
        "video_type": "emoji" if emoji_video else "standard",
        "asset_overlays": _sanitize_asset_overlays(
            data.get("asset_overlays"),
            enabled=emoji_video,
        ),
    }

    if not duration_auto and duration_seconds:
        target = max(creat_min, min(creat_max, int(duration_seconds)))
        result["duration_seconds"] = target
        words = script.split()
        need = max(40, int(target * 2.4))
        if len(words) < int(need * 0.75):
            # Ask model once more to expand — keep topic, hit length
            expand = client.chat.completions.create(
                model=settings.openai_model,
                temperature=0.7,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Expand the spoken narration to the target length. "
                            "Keep the SAME language, topic, and hook. "
                            f"Target about {need} words (~{target} seconds). "
                            'Return JSON: {"script":"...","hook":"..."}'
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Target seconds: {target}\n"
                            f"Current script:\n{script}\n"
                            f"User prompt:\n{prompt}"
                        ),
                    },
                ],
            )
            _log_openai_usage(
                user_id=user_id,
                job_id=job_id,
                response=expand,
                kind="creativity_script_expand",
            )
            try:
                expanded = json.loads(expand.choices[0].message.content or "{}")
                new_script = (expanded.get("script") or "").strip()
                if new_script and len(new_script.split()) > len(words):
                    result["script"] = new_script
                    if expanded.get("hook"):
                        result["hook"] = expanded["hook"]
            except Exception:
                pass
    elif data.get("duration_seconds") is not None:
        try:
            result["duration_seconds"] = max(
                creat_min, min(creat_max, int(data["duration_seconds"]))
            )
        except (TypeError, ValueError):
            pass

    if emoji_video:
        final_script = str(result.get("script") or script)
        storyboard = _plan_emoji_visual_storyboard(
            client=client,
            script=final_script,
            hook=str(result.get("hook") or ""),
            prompt=prompt,
            duration_seconds=(
                float(result["duration_seconds"])
                if result.get("duration_seconds") is not None
                else None
            ),
            user_id=user_id,
            job_id=job_id,
        )
        if len(storyboard) >= 8:
            result["asset_overlays"] = storyboard
        elif not result.get("asset_overlays"):
            clusters = [
                ("money bag", "chart increasing", "rocket"),
                ("light bulb", "robot", "laptop"),
                ("globe", "briefcase", "trophy"),
                ("fire", "zap", "check"),
                ("locked", "key", "shield"),
            ]
            draft: list[dict[str, Any]] = []
            for bi, trio in enumerate(clusters):
                start = 0.06 + bi * 0.17
                positions = ("center_left", "center", "center_right")
                for ji, term in enumerate(trio):
                    is_icon = term in {"check", "shield"}
                    draft.append(
                        {
                            "kind": "icon" if is_icon else "emoji",
                            "query": term,
                            "label": term,
                            "meaning": term,
                            "start_pct": start,
                            "duration": 3.4,
                            "position": positions[ji],
                            "size_pct": 0.38 if ji == 1 else 0.26,
                            "role": "hero" if ji == 1 else "support",
                            "color": "#F8FAFC" if is_icon else None,
                        }
                    )
            result["asset_overlays"] = _sanitize_asset_overlays(draft, enabled=True)

    return result


def generate_script(
    training: dict[str, Any],
    *,
    user_id: str | None = None,
    job_id: str | None = None,
    user_brief: str | None = None,
    avoid_topics: list[str] | None = None,
) -> dict[str, Any]:
    """YouTube / AI-Training path — uses channel training settings."""
    client = OpenAI(api_key=settings.openai_api_key)
    duration_auto = bool(training.get("duration_auto"))
    video_format = _filled(training.get("video_format")) or "shorts"
    profile = _format_profile(video_format)
    min_d = int(profile["min_duration"])
    max_d = int(profile["max_duration"])
    raw_duration = int(training.get("duration_seconds") or profile["default_duration"])
    duration = max(min_d, min(max_d, raw_duration))
    word_count = max(40, int(duration * 2.4))
    language = _filled(training.get("language")) or "en"
    video_style = _filled(training.get("video_style"))
    video_style_line = f" / style: {video_style}" if video_style else ""

    brief_block = ""
    if user_brief and user_brief.strip():
        kind = "Short" if profile["is_short"] else "video"
        brief_block = f"""
USER TOPIC / IDEA FOR THIS VIDEO (topic only — NOT style instructions):
\"\"\"{user_brief.strip()}\"\"\"
Use this ONLY for the subject / angle of this one {kind}.
Do NOT treat it as instructions to change niche, content type, tone, format, or style.
Those always come from AI Training fields above.
"""

    avoid_block = ""
    if avoid_topics:
        listed = "\n".join(f"- {t}" for t in avoid_topics[:15])
        avoid_block = f"""
DO NOT reuse these recent titles/hooks/topics (pick a fresh angle):
{listed}
"""

    cta = _filled(training.get("cta"))
    cta_line = (
        f"End with this CTA, spoken in {language} (translate if the CTA text is English): {cta}"
        if cta
        else f"Optional soft CTA in {language} at the end — invent one only if it fits."
    )

    user_prompt = f"""
AI TRAINING (source of truth — empty fields were omitted on purpose):
{_training_lines(training)}

Language code (mandatory for all spoken/written output): {language}
{cta_line}
{brief_block}
{avoid_block}
Write one unique YouTube script for format "{video_format}".
Stay STRICTLY inside the AI Training niche / theme / content type.
The opening must feel bold and unforgettable in {language}.
Also return 5 varied pexels_queries (English stock-search phrases) for B-roll montage.
"""

    prompt_kwargs = {
        "language": language,
        "video_format": video_format,
        "video_style_line": video_style_line,
        "content_kind": profile["content_kind"],
        "aspect_hint": profile["aspect_hint"],
        "pacing_hint": profile["pacing_hint"],
        "min_duration": min_d,
        "max_duration": max_d,
        "default_duration": profile["default_duration"],
        "duration": duration,
        "word_count": word_count,
    }

    if duration_auto:
        system_content = SYSTEM_PROMPT_AUTO.format(**prompt_kwargs)
    else:
        system_content = SYSTEM_PROMPT.format(**prompt_kwargs)

    response = client.chat.completions.create(
        model=settings.openai_model,
        temperature=0.9,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_prompt.strip()},
        ],
    )
    _log_openai_usage(user_id=user_id, job_id=job_id, response=response)

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    script = (data.get("script") or "").strip()
    if not script:
        raise RuntimeError("OpenAI returned empty script")

    chosen_duration: int | None = None
    if duration_auto and data.get("duration_seconds") is not None:
        try:
            chosen_duration = max(min_d, min(max_d, int(data["duration_seconds"])))
        except (TypeError, ValueError):
            chosen_duration = None
    elif not duration_auto:
        chosen_duration = duration

    pexels_fallback = _filled(training.get("pexels_query")) or "cinematic b-roll"
    default_title = "Short" if profile["is_short"] else "Video"
    desc = data.get("description") or f"{script}{profile['hashtag_suffix']}"
    result: dict[str, Any] = {
        "hook": data.get("hook") or script.split(".")[0],
        "script": script,
        "title": (data.get("title") or default_title)[:90],
        "description": desc,
        "tags": data.get("tags") or list(profile["default_tags"]),
        "pexels_queries": data.get("pexels_queries") or [pexels_fallback],
        "subtitle_emphasis": data.get("subtitle_emphasis") or [],
        "aspect_ratio": profile["aspect"],
        "is_short": profile["is_short"],
    }
    if chosen_duration is not None:
        result["duration_seconds"] = chosen_duration
    return result
