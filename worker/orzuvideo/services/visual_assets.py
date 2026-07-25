from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from supabase import Client

from orzuvideo.pipeline.media import run_ffmpeg
from orzuvideo.services import db


_POSITIONS = {
    "top_left",
    "top_center",
    "top_right",
    "center_left",
    "center",
    "center_right",
    "bottom_left",
    "bottom_right",
}

# Map story concepts → concrete OpenMoji search names (never decorative fillers first).
_OPENMOJI_SYNONYMS: dict[str, list[str]] = {
    "idea": ["light bulb", "bulb", "thought balloon"],
    "think": ["thinking face", "light bulb"],
    "money": ["money bag", "dollar banknote", "coin"],
    "cash": ["money bag", "dollar banknote"],
    "profit": ["chart increasing", "money bag"],
    "growth": ["chart increasing", "rocket"],
    "increase": ["chart increasing", "up arrow"],
    "decrease": ["chart decreasing", "down arrow"],
    "business": ["briefcase", "office building"],
    "work": ["briefcase", "laptop"],
    "success": ["trophy", "party popper", "check mark button"],
    "win": ["trophy", "crown"],
    "warning": ["warning", "exclamation mark"],
    "danger": ["warning", "fire"],
    "love": ["red heart", "growing heart"],
    "happy": ["grinning face", "smiling face with smiling eyes"],
    "sad": ["crying face", "disappointed face"],
    "fast": ["rocket", "high voltage", "racing car"],
    "speed": ["rocket", "high voltage"],
    "energy": ["high voltage", "fire"],
    "fire": ["fire", "fire"],
    "tech": ["laptop", "robot", "mobile phone"],
    "ai": ["robot", "brain"],
    "robot": ["robot", "robot face"],
    "brain": ["brain", "thinking face"],
    "video": ["movie camera", "video camera", "film frames"],
    "camera": ["camera", "movie camera"],
    "location": ["round pushpin", "world map", "globe showing europe-africa"],
    "world": ["globe showing europe-africa", "world map", "globe with meridians"],
    "globe": ["globe showing europe-africa", "globe with meridians"],
    "lock": ["locked", "locked with key"],
    "secure": ["locked", "shield"],
    "shield": ["shield", "locked"],
    "key": ["key", "old key"],
    "shop": ["shopping cart", "shopping bags"],
    "shopping": ["shopping cart", "shopping bags"],
    "phone": ["mobile phone", "telephone"],
    "email": ["e-mail", "envelope"],
    "mail": ["envelope", "e-mail"],
    "time": ["alarm clock", "hourglass done", "watch"],
    "clock": ["alarm clock", "mantelpiece clock"],
    "people": ["busts in silhouette", "people holding hands"],
    "team": ["people holding hands", "busts in silhouette"],
    "user": ["bust in silhouette", "person"],
    "goal": ["direct hit", "bullseye", "flag in hole"],
    "target": ["direct hit", "bullseye"],
    "rocket": ["rocket"],
    "chart": ["chart increasing", "bar chart"],
    "graph": ["chart increasing", "bar chart"],
    "check": ["check mark button", "white heavy check mark"],
    "ok": ["OK hand", "check mark button"],
    "star": ["glowing star", "star"],
    "magic": ["sparkles", "magic wand"],
    "sparkle": ["sparkles"],
    "trophy": ["trophy"],
    "crown": ["crown"],
    "light": ["light bulb", "high voltage"],
    "bulb": ["light bulb"],
    "laptop": ["laptop"],
    "computer": ["laptop", "desktop computer"],
    "book": ["open book", "books"],
    "learn": ["open book", "graduation cap"],
    "school": ["graduation cap", "school"],
    "food": ["hamburger", "pizza"],
    "health": ["green heart", "herb", "medical symbol"],
    "sport": ["soccer ball", "person running"],
    "run": ["person running", "athletic shoe"],
    "car": ["automobile", "oncoming automobile"],
    "home": ["house", "house with garden"],
    "house": ["house", "house with garden"],
    "sun": ["sun", "sun with face"],
    "moon": ["crescent moon", "full moon face"],
    "water": ["water wave", "droplet"],
    "nature": ["deciduous tree", "herb"],
    "plant": ["seedling", "potted plant"],
    "music": ["musical notes", "headphone"],
    "speak": ["speaking head", "megaphone"],
    "talk": ["speech balloon", "speaking head"],
    "question": ["red question mark", "thinking face"],
    "answer": ["light bulb", "speech balloon"],
    "problem": ["warning", "confused face"],
    "solution": ["light bulb", "check mark button"],
    "start": ["rocket", "glowing star"],
    "finish": ["chequered flag", "trophy"],
    "sale": ["shopping cart", "money bag"],
    "price": ["money bag", "dollar banknote"],
    "dollar": ["dollar banknote", "money bag"],
    "euro": ["euro banknote", "money bag"],
    "crypto": ["coin", "money bag"],
    "data": ["bar chart", "laptop"],
    "cloud": ["cloud", "globe with meridians"],
    "security": ["locked", "shield"],
    "password": ["locked with key", "key"],
    "notification": ["bell", "bell with slash"],
    "bell": ["bell"],
    "calendar": ["calendar", "tear-off calendar"],
    "date": ["calendar", "spiral calendar"],
    "message": ["speech balloon", "envelope"],
    "chat": ["speech balloon", "left speech bubble"],
    "like": ["thumbs up", "red heart"],
    "dislike": ["thumbs down"],
    "clap": ["clapping hands", "raising hands"],
    "party": ["party popper", "confetti ball"],
    "celebrate": ["party popper", "trophy"],
}

_ICONIFY_FALLBACKS: dict[str, str] = {
    "alert": "lucide:triangle-alert",
    "analytics": "lucide:chart-line",
    "brain": "lucide:brain",
    "briefcase": "lucide:briefcase",
    "calendar": "lucide:calendar",
    "camera": "lucide:camera",
    "chart": "lucide:chart-line",
    "check": "lucide:circle-check",
    "cloud": "lucide:cloud",
    "crown": "lucide:crown",
    "email": "lucide:mail",
    "fire": "lucide:flame",
    "globe": "lucide:globe",
    "heart": "lucide:heart",
    "idea": "lucide:lightbulb",
    "key": "lucide:key",
    "laptop": "lucide:laptop",
    "location": "lucide:map-pin",
    "lock": "lucide:lock",
    "locked": "lucide:lock",
    "money": "lucide:badge-dollar-sign",
    "phone": "lucide:phone",
    "play": "lucide:play",
    "robot": "lucide:bot",
    "rocket": "lucide:rocket",
    "shield": "lucide:shield-check",
    "shopping": "lucide:shopping-cart",
    "star": "lucide:star",
    "target": "lucide:target",
    "trend": "lucide:trending-up",
    "trophy": "lucide:trophy",
    "users": "lucide:users",
    "video": "lucide:video",
    "zap": "lucide:zap",
}


def _clean_text(value: Any, fallback: str = "") -> str:
    text = str(value or fallback).strip()
    return re.sub(r"\s+", " ", text)[:90]


def _as_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _sanitize_color(raw: Any) -> str | None:
    text = str(raw or "").strip().lstrip("#").upper()
    if len(text) == 3 and all(c in "0123456789ABCDEF" for c in text):
        text = "".join(ch * 2 for ch in text)
    if len(text) == 6 and all(c in "0123456789ABCDEF" for c in text):
        return text
    return None


def _query_terms(query: str) -> list[str]:
    """Build search terms WITHOUT injecting random sparkles/stars."""
    q = _clean_text(query).lower()
    words = [w for w in re.split(r"[^a-z0-9]+", q) if len(w) > 1]
    terms: list[str] = []
    for item in [q, *words]:
        if item and item not in terms:
            terms.append(item)
        for syn in _OPENMOJI_SYNONYMS.get(item, []):
            if syn not in terms:
                terms.append(syn)
    return terms[:10]


def _row_score(row: dict[str, Any], query: str) -> int:
    """Prefer exact / prefix name matches over loose tag hits."""
    q = query.lower().strip()
    name = str(row.get("name") or "").lower()
    tags = str(row.get("tags") or "").lower()
    filename = str(row.get("filename") or "").lower()
    score = 0
    if name == q:
        score += 100
    elif name.startswith(q) or q.startswith(name):
        score += 70
    elif q in name:
        score += 50
    for part in q.split():
        if len(part) > 2 and part in name:
            score += 15
        if len(part) > 2 and part in tags:
            score += 8
        if len(part) > 2 and part in filename:
            score += 5
    return score


def _search_openmoji(sb: Client, query: str, used: set[str]) -> dict[str, Any] | None:
    select_cols = "hex,filename,storage_path,public_url,name,tags,group_name,subgroup"
    best: dict[str, Any] | None = None
    best_score = -1
    for term in _query_terms(query):
        pattern = f"%{term.replace('%', '').replace('_', '')}%"
        for column in ("name", "tags", "filename", "subgroup"):
            try:
                result = (
                    sb.table("openmoji")
                    .select(select_cols)
                    .ilike(column, pattern)
                    .limit(12)
                    .execute()
                )
            except Exception as exc:
                print(f"[OVERLAY] openmoji search skipped: {exc}")
                return None
            for row in result.data or []:
                asset_id = str(row.get("hex") or row.get("filename") or "")
                if not asset_id or asset_id in used:
                    continue
                score = _row_score(row, term) + (20 if column == "name" else 0)
                if score > best_score:
                    best = row
                    best_score = score
            if best_score >= 70:
                return best
    return best


def _iconify_url_for_query(query: str, color_hex: str | None) -> tuple[str, str] | None:
    hay = _clean_text(query).lower().replace("-", " ")
    color = color_hex or "FFFFFF"
    # Prefer longer token matches first.
    tokens = sorted(_ICONIFY_FALLBACKS.keys(), key=len, reverse=True)
    for token in tokens:
        if token in hay or hay in token:
            icon_id = _ICONIFY_FALLBACKS[token]
            prefix, name = icon_id.split(":", 1)
            url = (
                f"https://api.iconify.design/{prefix}/{name}.svg"
                f"?height=512&width=512&color=%23{quote(color)}"
            )
            return icon_id, url
    return None


def _download(url: str, dest: Path) -> bool:
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            res = client.get(url)
            res.raise_for_status()
            data = res.content
        if len(data) < 80:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True
    except Exception as exc:
        print(f"[OVERLAY] download failed {url}: {exc}")
        return False


def _rasterize(src: Path, dest: Path, *, tint_hex: str | None = None) -> bool:
    """SVG/PNG → square RGBA; optional color tint for monochrome icons."""
    try:
        vf = (
            "scale=768:768:force_original_aspect_ratio=decrease,"
            "pad=768:768:(ow-iw)/2:(oh-ih)/2:color=0x00000000,"
            "format=rgba"
        )
        if tint_hex and len(tint_hex) == 6:
            r = int(tint_hex[0:2], 16) / 255.0
            g = int(tint_hex[2:4], 16) / 255.0
            b = int(tint_hex[4:6], 16) / 255.0
            vf = (
                f"{vf},"
                f"colorchannelmixer="
                f"rr={r:.4f}:rg=0:rb=0:"
                f"gr=0:gg={g:.4f}:gb=0:"
                f"br=0:bg=0:bb={b:.4f}:aa=1"
            )
        run_ffmpeg(
            [
                "-i",
                str(src),
                "-vf",
                vf,
                "-frames:v",
                "1",
                str(dest),
            ]
        )
        return dest.exists() and dest.stat().st_size > 500
    except Exception as exc:
        print(f"[OVERLAY] rasterize skipped {src.name}: {exc}")
        return False


def prepare_visual_overlays(
    sb: Client,
    *,
    user_id: str,
    job_id: str,
    overlays: Any,
    work_dir: Path,
    video_duration: float,
) -> list[dict[str, Any]]:
    """Resolve AI overlay plan to local PNG assets for FFmpeg overlay."""
    if not isinstance(overlays, list) or not overlays:
        return []

    work_dir.mkdir(parents=True, exist_ok=True)
    out: list[dict[str, Any]] = []
    used: set[str] = set()
    total = max(1.0, float(video_duration or 1.0))

    for idx, raw in enumerate(overlays[:20]):
        if not isinstance(raw, dict):
            continue
        query = _clean_text(raw.get("query") or raw.get("label") or raw.get("meaning"))
        if not query:
            continue

        kind = str(raw.get("kind") or "emoji").strip().lower()
        if kind not in ("emoji", "icon"):
            kind = "emoji"
        role = str(raw.get("role") or "").strip().lower()
        if role not in ("hero", "support"):
            role = "hero" if (idx % 3 == 1) else "support"

        color_hex = _sanitize_color(raw.get("color"))
        provider = "openmoji"
        asset_id = ""
        source_url = ""
        source = work_dir / f"overlay_{idx}.svg"

        row = _search_openmoji(sb, query, used) if kind == "emoji" else None
        if kind == "icon":
            hit = _iconify_url_for_query(query, color_hex or "F8FAFC")
            if hit:
                asset_id, source_url = hit
                provider = "iconify"
            else:
                row = _search_openmoji(sb, query, used)
        if row and not source_url:
            asset_id = str(row.get("hex") or row.get("filename") or query)
            source_url = str(row.get("public_url") or "").strip()
            used.add(asset_id)
            provider = "openmoji"
            kind = "emoji"
        elif not source_url:
            hit = _iconify_url_for_query(query, color_hex or "FFFFFF")
            if hit:
                asset_id, source_url = hit
                provider = "iconify"
                kind = "icon"

        if not source_url:
            print(f"[OVERLAY] no asset for query={query!r}")
            continue
        if not _download(source_url, source):
            continue

        png = work_dir / f"overlay_{idx}.png"
        if not _rasterize(source, png, tint_hex=None):
            continue

        start_pct = max(
            0.01, min(0.92, _as_float(raw.get("start_pct"), 0.04 + idx * 0.045))
        )
        start = min(max(0.0, total * start_pct), max(0.0, total - 0.8))
        dur = max(1.8, min(6.0, _as_float(raw.get("duration"), 3.2)))
        dur = min(dur, max(0.8, total - start))
        position = str(raw.get("position") or "center").strip().lower()
        if position not in _POSITIONS:
            position = "center"
        default_size = 0.36 if role == "hero" else 0.24
        size_pct = max(0.18, min(0.46, _as_float(raw.get("size_pct"), default_size)))

        try:
            db.record_media_usage(
                sb,
                user_id=user_id,
                provider=provider,
                asset_id=asset_id,
                job_id=job_id,
                title=_clean_text(raw.get("label") or raw.get("meaning") or query),
                meta={
                    "query": query,
                    "source_url": source_url,
                    "color": color_hex,
                    "kind": kind,
                    "role": role,
                    "meaning": raw.get("meaning"),
                },
            )
        except Exception:
            pass

        out.append(
            {
                "path": png,
                "kind": kind,
                "role": role,
                "query": query,
                "label": _clean_text(raw.get("label") or query),
                "provider": provider,
                "asset_id": asset_id,
                "source_url": source_url,
                "start": round(start, 3),
                "duration": round(dur, 3),
                "position": position,
                "size_pct": round(size_pct, 3),
                "color": f"#{color_hex}" if color_hex else None,
                "animation": str(raw.get("animation") or "auto").strip().lower()[:24]
                or "auto",
            }
        )

    print(f"[OVERLAY] prepared {len(out)} visual overlay(s)")
    return out
